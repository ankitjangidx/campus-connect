const {
  getSessionUserById,
  loginUser,
  registerUser
} = require("../services/dataService");
const asyncHandler = require("../utils/asyncHandler");
const {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  signAuthToken
} = require("../utils/auth");

function setAuthCookie(res, userId) {
  const token = signAuthToken(userId);
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions());
}

const login = asyncHandler(async (req, res) => {
  const user = await loginUser(req.body);
  setAuthCookie(res, user.id);
  res.json({ user });
});

const register = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);
  setAuthCookie(res, user.id);
  res.status(201).json({ user });
});

const getCurrentSession = asyncHandler(async (req, res) => {
  const user = await getSessionUserById(req.auth.userId);
  res.json({ user });
});

const logout = asyncHandler(async (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions());
  res.json({ ok: true });
});

module.exports = {
  getCurrentSession,
  login,
  logout,
  register
};
