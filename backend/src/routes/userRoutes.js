const express = require("express");
const {
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
} = require("../controllers/userController");
const { requireAuth, requireSelfParam } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);
router.get("/", getUsers);
router.get("/:id/dashboard", requireSelfParam("id"), getDashboard);
router.get("/:id/profile", requireSelfParam("id"), getProfile);
router.put("/:id/profile", requireSelfParam("id"), putProfile);
router.get("/:id/notifications", requireSelfParam("id"), getNotifications);
router.post("/:id/notifications/read", requireSelfParam("id"), postReadNotifications);
router.get("/:id/connections", requireSelfParam("id"), getConnections);
router.get("/:id/connection-requests", requireSelfParam("id"), getConnectionRequests);
router.post("/:id/connections", requireSelfParam("id"), postConnection);
router.post(
  "/:id/connection-requests/:requestId/accept",
  requireSelfParam("id"),
  postAcceptConnectionRequest
);
router.post(
  "/:id/connection-requests/:requestId/reject",
  requireSelfParam("id"),
  postRejectConnectionRequest
);
router.get("/:id/messages/:peerId", requireSelfParam("id"), getMessages);
router.post("/:id/messages/:peerId", requireSelfParam("id"), postMessage);
router.get("/:id/questions", requireSelfParam("id"), getUserQuestions);
router.get("/:id/mentorships", requireSelfParam("id"), getMentorships);
router.get("/:id", getUser);

module.exports = router;
