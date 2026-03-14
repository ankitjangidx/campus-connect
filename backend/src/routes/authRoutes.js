const express = require("express");
const {
  getCurrentSession,
  login,
  logout,
  register
} = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.get("/me", requireAuth, getCurrentSession);
router.post("/logout", logout);

module.exports = router;
