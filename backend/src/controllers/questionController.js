const {
  createQuestion,
  createQuestionComment,
  createQuestionCommentNotifications,
  deleteQuestionComment,
  listQuestionCommentsForViewer,
  listNotifications,
  listQuestions,
  markQuestionNotificationsRead,
  resolveQuestionComment,
  updateQuestionComment
} = require("../services/dataService");
const { emitToUsers } = require("../socket");
const asyncHandler = require("../utils/asyncHandler");

const getQuestions = asyncHandler(async (_req, res) => {
  const questions = await listQuestions();
  res.json(questions);
});

const postQuestion = asyncHandler(async (req, res) => {
  const question = await createQuestion({
    userId: req.auth.userId,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category
  });
  res.status(201).json(question);
});

const getQuestionComments = asyncHandler(async (req, res) => {
  const comments = await listQuestionCommentsForViewer(req.params.id, req.auth.userId);
  const readState = await markQuestionNotificationsRead(req.params.id, req.auth.userId);

  if (readState.readIds.length) {
    emitToUsers([req.auth.userId], "notification:read", readState);
  }

  res.json(comments);
});

const postQuestionComment = asyncHandler(async (req, res) => {
  const comment = await createQuestionComment({
    questionId: req.params.id,
    userId: req.auth.userId,
    parentId: req.body.parentId,
    body: req.body.body
  });
  const notifications = await createQuestionCommentNotifications(comment.id);

  for (const notification of notifications) {
    const state = await listNotifications(notification.userId);
    emitToUsers([notification.userId], "notification:created", {
      notification,
      unreadCount: state.unreadCount
    });
  }

  res.status(201).json(comment);
});

const postResolveQuestionComment = asyncHandler(async (req, res) => {
  const question = await resolveQuestionComment({
    questionId: req.params.id,
    resolverUserId: req.auth.userId,
    commentId: req.body.commentId
  });
  res.json(question);
});

const putQuestionComment = asyncHandler(async (req, res) => {
  const comment = await updateQuestionComment({
    questionId: req.params.id,
    commentId: req.params.commentId,
    userId: req.auth.userId,
    body: req.body.body
  });
  res.json(comment);
});

const deleteQuestionCommentById = asyncHandler(async (req, res) => {
  const comment = await deleteQuestionComment({
    questionId: req.params.id,
    commentId: req.params.commentId,
    userId: req.auth.userId
  });
  res.json(comment);
});

module.exports = {
  deleteQuestionCommentById,
  getQuestionComments,
  getQuestions,
  postQuestion,
  postQuestionComment,
  postResolveQuestionComment,
  putQuestionComment
};
