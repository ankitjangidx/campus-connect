const {
  Connection,
  EmailOtp,
  Mentorship,
  Message,
  Notification,
  Op,
  Question,
  QuestionComment,
  User
} = require("../models");
const { comparePassword, hashPassword } = require("../utils/password");
const { sendOtpEmail } = require("./mailService");
const {
  buildProfileStatus,
  normalizeUserModel,
  toEditableProfile,
  toPublicUser,
  toSessionUser
} = require("../utils/serializers");

function normalizeId(value, label) {
  const id = Number.parseInt(value, 10);

  if (Number.isNaN(id) || id <= 0) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function mapMessage(message) {
  const record = typeof message.get === "function" ? message.get({ plain: true }) : message;
  const createdAt = record.createdAt ?? record.created_at ?? null;
  const readAt = record.readAt ?? record.read_at ?? null;

  return {
    id: record.id,
    senderId: record.senderId,
    recipientId: record.recipientId,
    body: record.body,
    createdAt,
    readAt
  };
}

function getUserDisplayName(user) {
  if (!user) {
    return "Campus Connect user";
  }

  return user.firstName || user.lastName
    ? `${user.firstName} ${user.lastName}`.trim()
    : user.username;
}

function mapNotification(notification) {
  const record =
    typeof notification.get === "function" ? notification.get({ plain: true }) : notification;
  const actor = normalizeUserModel(record.actor);

  return {
    id: record.id,
    userId: record.userId,
    type: record.type,
    title: record.title,
    body: record.body,
    questionId: record.questionId || null,
    commentId: record.commentId || null,
    peerUserId: record.peerUserId || null,
    readAt: record.readAt || null,
    createdAt: record.createdAt,
    actor: actor
      ? {
          id: actor.id,
          name: getUserDisplayName(actor),
          username: actor.username
        }
      : null
  };
}

function mapQuestion(question) {
  const record = typeof question.get === "function" ? question.get({ plain: true }) : question;
  const author = normalizeUserModel(record.author);
  const resolvedComment = record.resolvedComment;

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    resolved: Boolean(record.resolved),
    resolvedCommentId: record.resolvedCommentId || null,
    createdAt: record.createdAt,
    author: {
      id: author.id,
      name:
        author.firstName || author.lastName
          ? `${author.firstName} ${author.lastName}`.trim()
          : author.username,
      username: author.username
    },
    resolvedBy: resolvedComment
      ? {
          commentId: resolvedComment.id,
          userId: resolvedComment.userId
        }
      : null
  };
}

function mapQuestionComment(comment, questionOwnerId, resolvedCommentId, viewerUserId) {
  const record = typeof comment.get === "function" ? comment.get({ plain: true }) : comment;
  const author = normalizeUserModel(record.author);
  const deleted = Boolean(record.deletedAt);

  return {
    id: record.id,
    questionId: record.questionId,
    userId: record.userId,
    parentId: record.parentId,
    body: deleted ? "[deleted]" : record.body,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt || record.createdAt,
    editedAt: record.editedAt || null,
    isEdited: !deleted && Boolean(record.editedAt),
    isDeleted: deleted,
    isResolved: record.id === resolvedCommentId,
    canResolve: questionOwnerId && record.userId !== questionOwnerId,
    canEdit: !deleted && viewerUserId === record.userId,
    canDelete: !deleted && viewerUserId === record.userId,
    isQuestionAuthor: record.userId === questionOwnerId,
    author: {
      id: author.id,
      name:
        author.firstName || author.lastName
          ? `${author.firstName} ${author.lastName}`.trim()
          : author.username,
      username: author.username
    },
    replies: []
  };
}

function buildCommentTree(comments) {
  const commentMap = new Map();
  const roots = [];

  comments.forEach((comment) => {
    commentMap.set(comment.id, comment);
  });

  comments.forEach((comment) => {
    if (comment.parentId && commentMap.has(comment.parentId)) {
      commentMap.get(comment.parentId).replies.push(comment);
      return;
    }

    roots.push(comment);
  });

  return roots;
}

function mapConnectionRecord(connection, userId) {
  const record =
    typeof connection.get === "function" ? connection.get({ plain: true }) : connection;
  const peer = record.userOneId === userId ? record.userTwo : record.userOne;

  return {
    requestId: record.id,
    ...toPublicUser(normalizeUserModel(peer)),
    status: record.status,
    requestedById: record.requestedById,
    direction: record.requestedById === userId ? "outgoing" : "incoming",
    requestedAt: record.createdAt,
    acceptedAt: record.acceptedAt,
    connectedAt: record.acceptedAt || record.createdAt
  };
}

async function getUserEntityById(id) {
  const userId = normalizeId(id, "user id");
  const user = await User.findByPk(userId);
  return normalizeUserModel(user);
}

async function getSessionUserById(id) {
  const user = await getUserEntityById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return toSessionUser(user);
}

async function getUserModelById(id) {
  const userId = normalizeId(id, "user id");
  return User.findByPk(userId);
}

async function getUserForLogin(identifier) {
  const trimmedIdentifier = identifier.trim();

  return User.findOne({
    where: {
      [Op.or]: [
        { userIdentifier: trimmedIdentifier },
        { email: trimmedIdentifier.toLowerCase() }
      ]
    }
  });
}

async function countUnreadNotifications(userId) {
  return Notification.count({
    where: {
      userId,
      readAt: null
    }
  });
}

async function createNotificationRecord(payload) {
  const notification = await Notification.create(payload);
  const populatedNotification = await Notification.findByPk(notification.id, {
    include: [{ model: User, as: "actor" }]
  });

  return mapNotification(populatedNotification || notification);
}

async function requestRegistrationOtp({ email }) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({
    where: { email: normalizedEmail }
  });

  if (existing) {
    const error = new Error("A user with that email already exists");
    error.statusCode = 409;
    throw error;
  }

  const otpCode = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await EmailOtp.update(
    { usedAt: new Date() },
    {
      where: {
        email: normalizedEmail,
        purpose: "register",
        usedAt: null
      }
    }
  );

  await EmailOtp.create({
    email: normalizedEmail,
    purpose: "register",
    otpHash: hashPassword(otpCode),
    expiresAt
  });

  await sendOtpEmail({
    email: normalizedEmail,
    otpCode
  });

  return {
    email: normalizedEmail,
    expiresAt: expiresAt.toISOString()
  };
}

async function consumeOtp({ email, purpose, otpCode }) {
  const normalizedEmail = email?.trim().toLowerCase();
  const trimmedOtp = otpCode?.trim();

  if (!normalizedEmail || !trimmedOtp) {
    const error = new Error("Email and OTP are required");
    error.statusCode = 400;
    throw error;
  }

  const otpRecord = await EmailOtp.findOne({
    where: {
      email: normalizedEmail,
      purpose,
      usedAt: null,
      expiresAt: {
        [Op.gt]: new Date()
      }
    },
    order: [["created_at", "DESC"]]
  });

  if (!otpRecord || otpRecord.otpHash !== hashPassword(trimmedOtp)) {
    const error = new Error("Invalid or expired OTP");
    error.statusCode = 400;
    throw error;
  }

  await otpRecord.update({
    usedAt: new Date()
  });
}

async function loginUser({ identifier, password }) {
  if (!identifier || !password) {
    const error = new Error("Identifier and password are required");
    error.statusCode = 400;
    throw error;
  }

  const userModel = await getUserForLogin(identifier);
  const user = normalizeUserModel(userModel);

  if (!user || !comparePassword(password, user.passwordHash)) {
    const error = new Error("Invalid credentials");
    error.statusCode = 401;
    throw error;
  }

  return toSessionUser(user);
}

async function registerUser(payload) {
  const { username, userId, email, password, admissionYear, course, branch, otpCode } =
    payload;

  if (!username || !userId || !email || !password || !otpCode) {
    const error = new Error(
      "Username, user ID, email, password, and OTP are required"
    );
    error.statusCode = 400;
    throw error;
  }

  const existing = await User.findOne({
    where: {
      [Op.or]: [
        { userIdentifier: userId.trim() },
        { email: email.trim().toLowerCase() }
      ]
    }
  });

  if (existing) {
    const error = new Error("A user with that ID or email already exists");
    error.statusCode = 409;
    throw error;
  }

  await consumeOtp({
    email,
    purpose: "register",
    otpCode
  });

  const userModel = await User.create({
    username: username.trim(),
    userIdentifier: userId.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    course: course || "",
    branch: branch || "",
    admissionYear: admissionYear || null,
    internships: [],
    projects: [],
    workExperiences: [],
    skills: []
  });

  return toSessionUser(normalizeUserModel(userModel));
}

async function listUsers({ excludeUserId } = {}) {
  const where = excludeUserId
    ? {
        id: {
          [Op.ne]: normalizeId(excludeUserId, "user id")
        }
      }
    : undefined;

  const users = await User.findAll({
    where,
    order: [["first_name", "ASC"], ["username", "ASC"]]
  });

  return users.map((user) => toPublicUser(normalizeUserModel(user)));
}

async function getPublicUserProfile(id) {
  const user = await getUserEntityById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return toPublicUser(user);
}

async function getEditableProfile(id) {
  const user = await getUserEntityById(id);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return toEditableProfile(user);
}

async function updateProfile(id, payload) {
  const userId = normalizeId(id, "user id");
  const userModel = await getUserModelById(userId);

  if (!userModel) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const personal = payload.personal || {};
  const academic = payload.academic || {};
  const career = payload.career || {};
  const skills = normalizeArray(payload.skills);

  if (!personal.email) {
    const error = new Error("Email is required");
    error.statusCode = 400;
    throw error;
  }

  const duplicate = await User.findOne({
    where: {
      email: personal.email.trim().toLowerCase(),
      id: {
        [Op.ne]: userId
      }
    }
  });

  if (duplicate) {
    const error = new Error("That email is already in use");
    error.statusCode = 409;
    throw error;
  }

  await userModel.update({
    firstName: personal.firstName || "",
    lastName: personal.lastName || "",
    bio: personal.bio || "",
    dob: personal.dob || null,
    gender: personal.gender || "",
    phoneNumber: personal.phoneNumber || "",
    alternatePhone: personal.alternatePhone || "",
    email: personal.email.trim().toLowerCase(),
    course: academic.course || "",
    branch: academic.branch || "",
    admissionYear: academic.admissionYear || null,
    examPrep: academic.examPrep || "no",
    examType: academic.examType || "",
    otherExam: academic.otherExam || "",
    internships: normalizeArray(academic.internships),
    projects: normalizeArray(academic.projects),
    workExperiences: normalizeArray(career.workExperiences),
    skills
  });

  return getEditableProfile(userId);
}

async function listConnections(id) {
  const userId = normalizeId(id, "user id");
  const connections = await Connection.findAll({
    where: {
      [Op.or]: [{ userOneId: userId }, { userTwoId: userId }],
      status: "accepted"
    },
    include: [
      { model: User, as: "userOne" },
      { model: User, as: "userTwo" }
    ],
    order: [["created_at", "DESC"]]
  });

  return connections.map((connection) => mapConnectionRecord(connection, userId));
}

async function listConnectionRequests(id) {
  const userId = normalizeId(id, "user id");
  const requests = await Connection.findAll({
    where: {
      [Op.or]: [{ userOneId: userId }, { userTwoId: userId }],
      status: "pending"
    },
    include: [
      { model: User, as: "userOne" },
      { model: User, as: "userTwo" },
      { model: User, as: "requester" }
    ],
    order: [["created_at", "DESC"]]
  });

  const mappedRequests = requests.map((connection) => mapConnectionRecord(connection, userId));

  return {
    incoming: mappedRequests.filter((request) => request.direction === "incoming"),
    outgoing: mappedRequests.filter((request) => request.direction === "outgoing")
  };
}

async function areUsersConnected(userId, peerId) {
  const userOneId = Math.min(userId, peerId);
  const userTwoId = Math.max(userId, peerId);

  const connection = await Connection.findOne({
    where: { userOneId, userTwoId, status: "accepted" }
  });

  return Boolean(connection);
}

async function createConnection(id, targetId) {
  const result = await createConnectionWithNotification(id, targetId);
  return result.connection;
}

async function createConnectionWithNotification(id, targetId) {
  const userId = normalizeId(id, "user id");
  const peerId = normalizeId(targetId, "target user id");

  if (userId === peerId) {
    const error = new Error("You cannot connect with yourself");
    error.statusCode = 400;
    throw error;
  }

  const [user, peer] = await Promise.all([getUserModelById(userId), getUserModelById(peerId)]);

  if (!user || !peer) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const userOneId = Math.min(userId, peerId);
  const userTwoId = Math.max(userId, peerId);

  const [connection, created] = await Connection.findOrCreate({
    where: { userOneId, userTwoId },
    defaults: {
      userOneId,
      userTwoId,
      status: "pending",
      requestedById: userId,
      acceptedAt: null
    }
  });

  const populatedConnection = await Connection.findByPk(connection.id, {
    include: [
      { model: User, as: "userOne" },
      { model: User, as: "userTwo" },
      { model: User, as: "requester" }
    ]
  });

  const mapped = mapConnectionRecord(populatedConnection, userId);

  if (!created || mapped.status !== "pending") {
    return { connection: mapped, notification: null, recipientUserId: null };
  }

  const actor = normalizeUserModel(user);
  const notification = await createNotificationRecord({
    userId: peerId,
    actorId: userId,
    type: "connection_request",
    title: `${getUserDisplayName(actor)} sent you a connection request`,
    body: "Open your dashboard to accept or decline.",
    peerUserId: userId
  });

  return { connection: mapped, notification, recipientUserId: peerId };
}

async function acceptConnectionRequest(id, requestIdValue) {
  const result = await acceptConnectionRequestWithNotification(id, requestIdValue);
  return result.connection;
}

async function acceptConnectionRequestWithNotification(id, requestIdValue) {
  const userId = normalizeId(id, "user id");
  const requestId = normalizeId(requestIdValue, "request id");
  const connection = await Connection.findByPk(requestId, {
    include: [
      { model: User, as: "userOne" },
      { model: User, as: "userTwo" },
      { model: User, as: "requester" }
    ]
  });

  if (!connection) {
    const error = new Error("Connection request not found");
    error.statusCode = 404;
    throw error;
  }

  if (![connection.userOneId, connection.userTwoId].includes(userId)) {
    const error = new Error("Connection request not found");
    error.statusCode = 404;
    throw error;
  }

  if (connection.requestedById === userId) {
    const error = new Error("You cannot accept your own connection request");
    error.statusCode = 400;
    throw error;
  }

  if (connection.status !== "pending") {
    return { connection: mapConnectionRecord(connection, userId), notification: null, recipientUserId: null };
  }

  await connection.update({
    status: "accepted",
    acceptedAt: new Date()
  });

  const mapped = mapConnectionRecord(connection, userId);
  const actor = normalizeUserModel(await getUserModelById(userId));
  const requesterUserId = connection.requestedById;

  const notification = await createNotificationRecord({
    userId: requesterUserId,
    actorId: userId,
    type: "connection_accepted",
    title: `${getUserDisplayName(actor)} accepted your connection request`,
    body: "You can now start chatting.",
    peerUserId: userId
  });

  return { connection: mapped, notification, recipientUserId: requesterUserId };
}

async function rejectConnectionRequestWithNotification(id, requestIdValue) {
  const userId = normalizeId(id, "user id");
  const requestId = normalizeId(requestIdValue, "request id");
  const connection = await Connection.findByPk(requestId, {
    include: [
      { model: User, as: "userOne" },
      { model: User, as: "userTwo" },
      { model: User, as: "requester" }
    ]
  });

  if (!connection) {
    const error = new Error("Connection request not found");
    error.statusCode = 404;
    throw error;
  }

  if (![connection.userOneId, connection.userTwoId].includes(userId)) {
    const error = new Error("Connection request not found");
    error.statusCode = 404;
    throw error;
  }

  if (connection.requestedById === userId) {
    const error = new Error("You cannot reject your own connection request");
    error.statusCode = 400;
    throw error;
  }

  if (connection.status !== "pending") {
    const error = new Error("Only pending requests can be rejected");
    error.statusCode = 400;
    throw error;
  }

  const requesterUserId = connection.requestedById;
  const actor = normalizeUserModel(await getUserModelById(userId));

  await connection.destroy();

  const notification = await createNotificationRecord({
    userId: requesterUserId,
    actorId: userId,
    type: "connection_rejected",
    title: `${getUserDisplayName(actor)} declined your connection request`,
    body: "You can send a new request again later.",
    peerUserId: userId
  });

  return { ok: true, notification, recipientUserId: requesterUserId };
}

async function getConversation(id, peerIdValue) {
  const userId = normalizeId(id, "user id");
  const peerId = normalizeId(peerIdValue, "peer user id");
  const peer = await getPublicUserProfile(peerId);
  const connected = await areUsersConnected(userId, peerId);

  if (!connected) {
    const error = new Error("You can only message connected users");
    error.statusCode = 403;
    throw error;
  }

  const messages = await Message.findAll({
    where: {
      [Op.or]: [
        { senderId: userId, recipientId: peerId },
        { senderId: peerId, recipientId: userId }
      ]
    },
    order: [["created_at", "ASC"]]
  });

  return {
    peer,
    messages: messages.map(mapMessage)
  };
}

async function markConversationRead(id, peerIdValue) {
  const userId = normalizeId(id, "user id");
  const peerId = normalizeId(peerIdValue, "peer user id");
  const now = new Date();

  await Message.update(
    { readAt: now },
    {
      where: {
        senderId: peerId,
        recipientId: userId,
        readAt: null
      }
    }
  );

  const unreadNotifications = await Notification.findAll({
    where: {
      userId,
      type: "message",
      peerUserId: peerId,
      readAt: null
    },
    attributes: ["id"]
  });
  const readIds = unreadNotifications.map((notification) => notification.id);

  if (readIds.length) {
    await Notification.update(
      { readAt: now },
      {
        where: {
          id: readIds
        }
      }
    );
  }

  return {
    readIds,
    unreadCount: await countUnreadNotifications(userId)
  };
}

async function createMessage(id, peerIdValue, body) {
  const userId = normalizeId(id, "user id");
  const peerId = normalizeId(peerIdValue, "peer user id");
  const trimmedBody = body?.trim();

  if (!trimmedBody) {
    const error = new Error("Message body is required");
    error.statusCode = 400;
    throw error;
  }

  const peer = await getUserModelById(peerId);
  const connected = await areUsersConnected(userId, peerId);

  if (!peer) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!connected) {
    const error = new Error("You can only message connected users");
    error.statusCode = 403;
    throw error;
  }

  const message = await Message.create({
    senderId: userId,
    recipientId: peerId,
    body: trimmedBody
  });

  const populatedMessage = await Message.findByPk(message.id);
  return mapMessage(populatedMessage || message);
}

async function createMessageNotification(message) {
  const sender = normalizeUserModel(await getUserModelById(message.senderId));

  if (!sender) {
    return null;
  }

  return createNotificationRecord({
    userId: message.recipientId,
    actorId: message.senderId,
    type: "message",
    title: `${getUserDisplayName(sender)} sent you a message`,
    body: message.body,
    peerUserId: message.senderId
  });
}

async function getQuestionModelById(id) {
  const questionId = normalizeId(id, "question id");
  return Question.findByPk(questionId, {
    include: [
      { model: User, as: "author" },
      { model: QuestionComment, as: "resolvedComment", required: false }
    ]
  });
}

async function listQuestions({ userId } = {}) {
  const where = userId ? { userId: normalizeId(userId, "user id") } : undefined;
  const questions = await Question.findAll({
    where,
    include: [
      { model: User, as: "author" },
      { model: QuestionComment, as: "resolvedComment", required: false }
    ],
    order: [["created_at", "DESC"]]
  });

  return questions.map(mapQuestion);
}

async function createQuestion({ userId, title, description, category }) {
  const authorId = normalizeId(userId, "user id");

  if (!title || !description || !category) {
    const error = new Error("Title, description, and category are required");
    error.statusCode = 400;
    throw error;
  }

  const question = await Question.create({
    userId: authorId,
    title: title.trim(),
    description: description.trim(),
    category: category.trim().toLowerCase()
  });

  const populatedQuestion = await getQuestionModelById(question.id);
  return mapQuestion(populatedQuestion);
}

async function listQuestionComments(questionIdValue) {
  return listQuestionCommentsForViewer(questionIdValue, null);
}

async function listQuestionCommentsForViewer(questionIdValue, viewerUserIdValue) {
  const question = await getQuestionModelById(questionIdValue);
  const viewerUserId = viewerUserIdValue ? normalizeId(viewerUserIdValue, "viewer user id") : null;

  if (!question) {
    const error = new Error("Question not found");
    error.statusCode = 404;
    throw error;
  }

  const comments = await QuestionComment.findAll({
    where: {
      questionId: question.id
    },
    include: [{ model: User, as: "author" }],
    order: [
      ["created_at", "ASC"],
      ["id", "ASC"]
    ]
  });

  return buildCommentTree(
    comments.map((comment) =>
      mapQuestionComment(
        comment,
        question.userId,
        question.resolvedCommentId,
        viewerUserId
      )
    )
  );
}

async function markQuestionNotificationsRead(questionIdValue, viewerUserIdValue) {
  const questionId = normalizeId(questionIdValue, "question id");
  const viewerUserId = normalizeId(viewerUserIdValue, "viewer user id");
  const now = new Date();
  const unreadNotifications = await Notification.findAll({
    where: {
      userId: viewerUserId,
      questionId,
      readAt: null
    },
    attributes: ["id"]
  });
  const readIds = unreadNotifications.map((notification) => notification.id);

  if (readIds.length) {
    await Notification.update(
      { readAt: now },
      {
        where: {
          id: readIds
        }
      }
    );
  }

  return {
    readIds,
    unreadCount: await countUnreadNotifications(viewerUserId)
  };
}

async function createQuestionComment({ questionId, userId, parentId, body }) {
  const normalizedQuestionId = normalizeId(questionId, "question id");
  const normalizedUserId = normalizeId(userId, "user id");
  const trimmedBody = body?.trim();

  if (!trimmedBody) {
    const error = new Error("Comment body is required");
    error.statusCode = 400;
    throw error;
  }

  const [question, author] = await Promise.all([
    getQuestionModelById(normalizedQuestionId),
    getUserModelById(normalizedUserId)
  ]);

  if (!question) {
    const error = new Error("Question not found");
    error.statusCode = 404;
    throw error;
  }

  if (!author) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  let normalizedParentId = null;

  if (parentId) {
    normalizedParentId = normalizeId(parentId, "parent comment id");
    const parentComment = await QuestionComment.findOne({
      where: {
        id: normalizedParentId,
        questionId: normalizedQuestionId
      }
    });

    if (!parentComment) {
      const error = new Error("Parent comment not found");
      error.statusCode = 404;
      throw error;
    }
  }

  const comment = await QuestionComment.create({
    questionId: normalizedQuestionId,
    userId: normalizedUserId,
    parentId: normalizedParentId,
    body: trimmedBody
  });

  const populatedComment = await QuestionComment.findByPk(comment.id, {
    include: [{ model: User, as: "author" }]
  });

  return mapQuestionComment(
    populatedComment,
    question.userId,
    question.resolvedCommentId,
    normalizedUserId
  );
}

async function createQuestionCommentNotifications(commentIdValue) {
  const commentId = normalizeId(commentIdValue, "comment id");
  const comment = await QuestionComment.findByPk(commentId, {
    include: [
      { model: User, as: "author" },
      {
        model: Question,
        as: "question",
        include: [{ model: User, as: "author" }]
      }
    ]
  });

  if (!comment || !comment.question) {
    return [];
  }

  const actor = normalizeUserModel(comment.author);
  const question = comment.question;
  const createdNotifications = [];
  const notifiedUserIds = new Set();

  function snippet(value) {
    return String(value || "").trim().slice(0, 180);
  }

  async function notifyUser(userId, type, title, body) {
    if (!userId || userId === comment.userId || notifiedUserIds.has(userId)) {
      return;
    }

    notifiedUserIds.add(userId);
    createdNotifications.push(
      await createNotificationRecord({
        userId,
        actorId: comment.userId,
        type,
        title,
        body,
        questionId: question.id,
        commentId: comment.id
      })
    );
  }

  if (comment.parentId) {
    const parentComment = await QuestionComment.findByPk(comment.parentId, {
      include: [{ model: User, as: "author" }]
    });

    if (parentComment) {
      await notifyUser(
        parentComment.userId,
        "comment_reply",
        `${getUserDisplayName(actor)} replied to your comment`,
        snippet(comment.body)
      );
    }

    await notifyUser(
      question.userId,
      "question_reply",
      `${getUserDisplayName(actor)} replied on your question`,
      snippet(comment.body)
    );
  } else {
    await notifyUser(
      question.userId,
      "question_comment",
      `${getUserDisplayName(actor)} commented on your question`,
      snippet(comment.body)
    );
  }

  return createdNotifications;
}

async function updateQuestionComment({ questionId, commentId, userId, body }) {
  const normalizedQuestionId = normalizeId(questionId, "question id");
  const normalizedCommentId = normalizeId(commentId, "comment id");
  const normalizedUserId = normalizeId(userId, "user id");
  const trimmedBody = body?.trim();

  if (!trimmedBody) {
    const error = new Error("Comment body is required");
    error.statusCode = 400;
    throw error;
  }

  const [question, comment] = await Promise.all([
    getQuestionModelById(normalizedQuestionId),
    QuestionComment.findOne({
      where: {
        id: normalizedCommentId,
        questionId: normalizedQuestionId
      },
      include: [{ model: User, as: "author" }]
    })
  ]);

  if (!question || !comment) {
    const error = new Error("Comment not found");
    error.statusCode = 404;
    throw error;
  }

  if (comment.userId !== normalizedUserId) {
    const error = new Error("You can only edit your own comments");
    error.statusCode = 403;
    throw error;
  }

  if (comment.deletedAt) {
    const error = new Error("Deleted comments cannot be edited");
    error.statusCode = 400;
    throw error;
  }

  await comment.update({
    body: trimmedBody,
    editedAt: new Date()
  });

  return mapQuestionComment(
    comment,
    question.userId,
    question.resolvedCommentId,
    normalizedUserId
  );
}

async function deleteQuestionComment({ questionId, commentId, userId }) {
  const normalizedQuestionId = normalizeId(questionId, "question id");
  const normalizedCommentId = normalizeId(commentId, "comment id");
  const normalizedUserId = normalizeId(userId, "user id");

  const [question, comment, comments] = await Promise.all([
    getQuestionModelById(normalizedQuestionId),
    QuestionComment.findOne({
      where: {
        id: normalizedCommentId,
        questionId: normalizedQuestionId
      },
      include: [{ model: User, as: "author" }]
    }),
    QuestionComment.findAll({
      where: {
        questionId: normalizedQuestionId
      },
      include: [{ model: User, as: "author" }]
    })
  ]);

  if (!question || !comment) {
    const error = new Error("Comment not found");
    error.statusCode = 404;
    throw error;
  }

  if (comment.userId !== normalizedUserId) {
    const error = new Error("You can only delete your own comments");
    error.statusCode = 403;
    throw error;
  }

  if (!comment.deletedAt) {
    await comment.update({
      body: "",
      deletedAt: new Date()
    });
  }

  const childIdsByParent = new Map();
  const plainComments = comments.map((item) =>
    typeof item.get === "function" ? item.get({ plain: true }) : item
  );

  plainComments.forEach((item) => {
    if (!item.parentId) {
      return;
    }

    const nextChildren = childIdsByParent.get(item.parentId) || [];
    nextChildren.push(item.id);
    childIdsByParent.set(item.parentId, nextChildren);
  });

  const deletedTreeIds = new Set([normalizedCommentId]);
  const queue = [normalizedCommentId];

  while (queue.length) {
    const currentId = queue.shift();
    const childIds = childIdsByParent.get(currentId) || [];
    childIds.forEach((childId) => {
      if (!deletedTreeIds.has(childId)) {
        deletedTreeIds.add(childId);
        queue.push(childId);
      }
    });
  }

  if (
    question.resolvedCommentId &&
    deletedTreeIds.has(Number(question.resolvedCommentId))
  ) {
    await question.update({
      resolved: false,
      resolvedCommentId: null
    });
    await Mentorship.destroy({
      where: {
        sourceQuestionId: normalizedQuestionId
      }
    });
  }

  return mapQuestionComment(
    comment,
    question.userId,
    null,
    normalizedUserId
  );
}

async function resolveQuestionComment({ questionId, resolverUserId, commentId }) {
  const normalizedQuestionId = normalizeId(questionId, "question id");
  const normalizedResolverId = normalizeId(resolverUserId, "resolver user id");
  const normalizedCommentId = normalizeId(commentId, "comment id");

  const question = await getQuestionModelById(normalizedQuestionId);

  if (!question) {
    const error = new Error("Question not found");
    error.statusCode = 404;
    throw error;
  }

  if (question.userId !== normalizedResolverId) {
    const error = new Error("Only the question author can resolve an answer");
    error.statusCode = 403;
    throw error;
  }

  if (
    question.resolvedCommentId &&
    Number(question.resolvedCommentId) !== normalizedCommentId
  ) {
    const error = new Error("This question already has a resolved answer");
    error.statusCode = 400;
    throw error;
  }

  const comment = await QuestionComment.findOne({
    where: {
      id: normalizedCommentId,
      questionId: normalizedQuestionId
    },
    include: [{ model: User, as: "author" }]
  });

  if (!comment) {
    const error = new Error("Comment not found");
    error.statusCode = 404;
    throw error;
  }

  if (comment.userId === normalizedResolverId) {
    const error = new Error("You cannot resolve your own answer");
    error.statusCode = 400;
    throw error;
  }

  if (!question.resolved || Number(question.resolvedCommentId) !== normalizedCommentId) {
    await question.update({
      resolved: true,
      resolvedCommentId: normalizedCommentId
    });
  }

  const questionAuthor = normalizeUserModel(question.author);
  const mentorshipPayload = {
    mentorId: comment.userId,
    menteeName:
      questionAuthor.firstName || questionAuthor.lastName
        ? `${questionAuthor.firstName} ${questionAuthor.lastName}`.trim()
        : questionAuthor.username,
    focusArea: `Resolved ${question.category} question`,
    startedAt: new Date().toISOString().slice(0, 10),
    notes: `Resolved question: ${question.title}`,
    sourceQuestionId: normalizedQuestionId,
    sourceCommentId: normalizedCommentId
  };

  const existingMentorship = await Mentorship.findOne({
    where: {
      sourceQuestionId: normalizedQuestionId
    }
  });

  if (existingMentorship) {
    await existingMentorship.update(mentorshipPayload);
  } else {
    await Mentorship.create(mentorshipPayload);
  }

  const updatedQuestion = await getQuestionModelById(normalizedQuestionId);
  return mapQuestion(updatedQuestion);
}

async function listMentorships(id) {
  const userId = normalizeId(id, "user id");
  const mentorships = await Mentorship.findAll({
    where: { mentorId: userId },
    order: [["started_at", "DESC"]]
  });

  return mentorships.map((mentorship) => {
    const record = mentorship.get({ plain: true });

    return {
      id: record.id,
      menteeName: record.menteeName,
      focusArea: record.focusArea,
      startedAt: record.startedAt,
      notes: record.notes || ""
    };
  });
}

async function listNotifications(id) {
  const userId = normalizeId(id, "user id");
  const [items, unreadCount] = await Promise.all([
    Notification.findAll({
      where: { userId },
      include: [{ model: User, as: "actor" }],
      order: [["created_at", "DESC"]],
      limit: 20
    }),
    countUnreadNotifications(userId)
  ]);

  return {
    items: items.map(mapNotification),
    unreadCount
  };
}

async function markNotificationsRead({ userId, notificationIds }) {
  const normalizedUserId = normalizeId(userId, "user id");
  const normalizedIds = Array.isArray(notificationIds)
    ? notificationIds
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    : [];
  const now = new Date();
  const where = {
    userId: normalizedUserId,
    readAt: null
  };

  if (normalizedIds.length) {
    where.id = normalizedIds;
  }

  const unreadNotifications = await Notification.findAll({
    where,
    attributes: ["id"]
  });
  const readIds = unreadNotifications.map((notification) => notification.id);

  if (readIds.length) {
    await Notification.update(
      { readAt: now },
      {
        where: {
          id: readIds
        }
      }
    );
  }

  return {
    readIds,
    unreadCount: await countUnreadNotifications(normalizedUserId)
  };
}

async function getDashboardData(id) {
  const userId = normalizeId(id, "user id");
  const user = await getUserEntityById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const [connections, questions, mentorships, recentMessages] = await Promise.all([
    listConnections(userId),
    listQuestions({ userId }),
    listMentorships(userId),
    Message.findAll({
      where: {
        [Op.or]: [{ senderId: userId }, { recipientId: userId }]
      },
      include: [
        { model: User, as: "sender" },
        { model: User, as: "recipient" }
      ],
      order: [["created_at", "DESC"]],
      limit: 6
    })
  ]);

  return {
    user: toSessionUser(user),
    stats: {
      peopleMentored: mentorships.length,
      connectionsMade: connections.length,
      questionsAsked: questions.length,
      badgesEarned: Math.floor((connections.length + mentorships.length + questions.length) / 3)
    },
    profileStatus: buildProfileStatus(user),
    connections: connections.slice(0, 4),
    questions: questions.slice(0, 4),
    mentorships: mentorships.slice(0, 4),
    recentMessages: recentMessages.map((message) => {
      const record = message.get({ plain: true });
      const peer = record.senderId === userId ? record.recipient : record.sender;
      const peerUser = normalizeUserModel(peer);

      return {
        id: record.id,
        body: record.body,
        createdAt: record.createdAt,
        peer: {
          id: peerUser.id,
          name:
            peerUser.firstName || peerUser.lastName
              ? `${peerUser.firstName} ${peerUser.lastName}`.trim()
              : peerUser.username,
          username: peerUser.username
        }
      };
    })
  };
}

module.exports = {
  acceptConnectionRequest,
  acceptConnectionRequestWithNotification,
  rejectConnectionRequestWithNotification,
  createConnection,
  createConnectionWithNotification,
  createMessage,
  createMessageNotification,
  createQuestion,
  createQuestionComment,
  createQuestionCommentNotifications,
  deleteQuestionComment,
  getConversation,
  getDashboardData,
  getEditableProfile,
  getPublicUserProfile,
  getSessionUserById,
  listNotifications,
  listConnections,
  listConnectionRequests,
  listMentorships,
  listQuestionComments,
  listQuestionCommentsForViewer,
  listQuestions,
  listUsers,
  loginUser,
  markConversationRead,
  markNotificationsRead,
  markQuestionNotificationsRead,
  requestRegistrationOtp,
  registerUser,
  resolveQuestionComment,
  updateQuestionComment,
  updateProfile
};
