const express = require("express");
const {
  deleteQuestionCommentById,
  getQuestionComments,
  getQuestions,
  postQuestion,
  postQuestionComment,
  postResolveQuestionComment,
  putQuestionComment
} = require("../controllers/questionController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/", getQuestions);
router.post("/", postQuestion);
router.get("/:id/comments", getQuestionComments);
router.post("/:id/comments", postQuestionComment);
router.put("/:id/comments/:commentId", putQuestionComment);
router.delete("/:id/comments/:commentId", deleteQuestionCommentById);
router.post("/:id/resolve", postResolveQuestionComment);

module.exports = router;
