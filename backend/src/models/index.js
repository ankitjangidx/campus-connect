const { Op } = require("sequelize");

const { sequelize } = require("../config/db");
const defineConnection = require("./Connection");
const defineEmailOtp = require("./EmailOtp");
const defineMentorship = require("./Mentorship");
const defineMessage = require("./Message");
const defineNotification = require("./Notification");
const defineQuestion = require("./Question");
const defineQuestionComment = require("./QuestionComment");
const defineUser = require("./User");

const User = defineUser(sequelize);
const Connection = defineConnection(sequelize);
const EmailOtp = defineEmailOtp(sequelize);
const Message = defineMessage(sequelize);
const Notification = defineNotification(sequelize);
const Question = defineQuestion(sequelize);
const QuestionComment = defineQuestionComment(sequelize);
const Mentorship = defineMentorship(sequelize);

Connection.belongsTo(User, {
  as: "userOne",
  foreignKey: "userOneId"
});

Connection.belongsTo(User, {
  as: "userTwo",
  foreignKey: "userTwoId"
});

Connection.belongsTo(User, {
  as: "requester",
  foreignKey: "requestedById"
});

Message.belongsTo(User, {
  as: "sender",
  foreignKey: "senderId"
});

Message.belongsTo(User, {
  as: "recipient",
  foreignKey: "recipientId"
});

Notification.belongsTo(User, {
  as: "user",
  foreignKey: "userId"
});

Notification.belongsTo(User, {
  as: "actor",
  foreignKey: "actorId"
});

Notification.belongsTo(User, {
  as: "peer",
  foreignKey: "peerUserId"
});

Notification.belongsTo(Question, {
  as: "question",
  foreignKey: "questionId"
});

Notification.belongsTo(QuestionComment, {
  as: "comment",
  foreignKey: "commentId"
});

Question.belongsTo(User, {
  as: "author",
  foreignKey: "userId"
});

Question.belongsTo(QuestionComment, {
  as: "resolvedComment",
  foreignKey: "resolvedCommentId"
});

QuestionComment.belongsTo(User, {
  as: "author",
  foreignKey: "userId"
});

QuestionComment.belongsTo(Question, {
  as: "question",
  foreignKey: "questionId"
});

QuestionComment.belongsTo(QuestionComment, {
  as: "parent",
  foreignKey: "parentId"
});

Mentorship.belongsTo(User, {
  as: "mentor",
  foreignKey: "mentorId"
});

module.exports = {
  sequelize,
  Op,
  User,
  Connection,
  EmailOtp,
  Message,
  Notification,
  Question,
  QuestionComment,
  Mentorship
};
