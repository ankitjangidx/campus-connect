const {
  acceptConnectionRequestWithNotification,
  rejectConnectionRequestWithNotification,
  createConnectionWithNotification,
  createMessage,
  createMessageNotification,
  getConversation,
  getDashboardData,
  getEditableProfile,
  getPublicUserProfile,
  listNotifications,
  listConnections,
  listConnectionRequests,
  listMentorships,
  listQuestions,
  listUsers,
  markConversationRead,
  markNotificationsRead,
  updateProfile
} = require("../services/dataService");
const { emitToUsers } = require("../socket");
const asyncHandler = require("../utils/asyncHandler");

const getUsers = asyncHandler(async (req, res) => {
  const users = await listUsers({
    excludeUserId: req.auth.userId
  });
  res.json(users);
});

const getDashboard = asyncHandler(async (req, res) => {
  const dashboard = await getDashboardData(req.params.id);
  res.json(dashboard);
});

const getProfile = asyncHandler(async (req, res) => {
  const profile = await getEditableProfile(req.params.id);
  res.json(profile);
});

const putProfile = asyncHandler(async (req, res) => {
  const profile = await updateProfile(req.params.id, req.body);
  res.json(profile);
});

const getConnections = asyncHandler(async (req, res) => {
  const connections = await listConnections(req.params.id);
  res.json(connections);
});

const getConnectionRequests = asyncHandler(async (req, res) => {
  const requests = await listConnectionRequests(req.params.id);
  res.json(requests);
});

const postConnection = asyncHandler(async (req, res) => {
  const result = await createConnectionWithNotification(req.params.id, req.body.targetUserId);

  if (result.notification && result.recipientUserId) {
    const unreadState = await listNotifications(result.recipientUserId);
    emitToUsers([result.recipientUserId], "notification:created", {
      notification: result.notification,
      unreadCount: unreadState.unreadCount
    });
  }

  res.status(201).json(result.connection);
});

const postAcceptConnectionRequest = asyncHandler(async (req, res) => {
  const result = await acceptConnectionRequestWithNotification(
    req.params.id,
    req.params.requestId
  );

  if (result.notification && result.recipientUserId) {
    const unreadState = await listNotifications(result.recipientUserId);
    emitToUsers([result.recipientUserId], "notification:created", {
      notification: result.notification,
      unreadCount: unreadState.unreadCount
    });
  }

  res.json(result.connection);
});

const postRejectConnectionRequest = asyncHandler(async (req, res) => {
  const result = await rejectConnectionRequestWithNotification(
    req.params.id,
    req.params.requestId
  );

  if (result.notification && result.recipientUserId) {
    const unreadState = await listNotifications(result.recipientUserId);
    emitToUsers([result.recipientUserId], "notification:created", {
      notification: result.notification,
      unreadCount: unreadState.unreadCount
    });
  }

  res.json({ ok: true });
});

const getMessages = asyncHandler(async (req, res) => {
  const conversation = await getConversation(req.params.id, req.params.peerId);
  const readState = await markConversationRead(req.params.id, req.params.peerId);

  if (readState.readIds.length) {
    emitToUsers([req.auth.userId], "notification:read", readState);
  }

  res.json(conversation);
});

const postMessage = asyncHandler(async (req, res) => {
  const message = await createMessage(
    req.params.id,
    req.params.peerId,
    req.body.body
  );

  emitToUsers([message.senderId, message.recipientId], "message:created", message);
  const notification = await createMessageNotification(message);

  if (notification) {
    const unreadState = await listNotifications(message.recipientId);
    emitToUsers([message.recipientId], "notification:created", {
      notification,
      unreadCount: unreadState.unreadCount
    });
  }

  res.status(201).json(message);
});

const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await listNotifications(req.params.id);
  res.json(notifications);
});

const postReadNotifications = asyncHandler(async (req, res) => {
  const result = await markNotificationsRead({
    userId: req.params.id,
    notificationIds: req.body.notificationIds
  });

  if (result.readIds.length) {
    emitToUsers([req.auth.userId], "notification:read", result);
  }

  res.json(result);
});

const getUserQuestions = asyncHandler(async (req, res) => {
  const questions = await listQuestions({ userId: req.params.id });
  res.json(questions);
});

const getMentorships = asyncHandler(async (req, res) => {
  const mentorships = await listMentorships(req.params.id);
  res.json(mentorships);
});

const getUser = asyncHandler(async (req, res) => {
  const user = await getPublicUserProfile(req.params.id);
  res.json(user);
});

module.exports = {
  getConnectionRequests,
  getConnections,
  getDashboard,
  getMentorships,
  getMessages,
  getNotifications,
  getProfile,
  getUser,
  getUserQuestions,
  getUsers,
  postAcceptConnectionRequest,
  postRejectConnectionRequest,
  postConnection,
  postMessage,
  postReadNotifications,
  putProfile
};
