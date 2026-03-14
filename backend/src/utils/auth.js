const jwt = require("jsonwebtoken");
require("dotenv").config();

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "campus_connect_token";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const COOKIE_MAX_AGE_MS =
  Number(process.env.AUTH_COOKIE_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000;

function getJwtSecret() {
  return process.env.JWT_SECRET || "campus-connect-development-secret";
}

function signAuthToken(userId) {
  return jwt.sign({ sub: String(userId) }, getJwtSecret(), {
    expiresIn: JWT_EXPIRES_IN
  });
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function buildAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: process.env.COOKIE_SAME_SITE || "lax",
    secure: process.env.COOKIE_SECURE === "true",
    maxAge: COOKIE_MAX_AGE_MS,
    path: "/"
  };
}

function parseCookieHeader(headerValue) {
  if (!headerValue) {
    return {};
  }

  return headerValue
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((cookies, entry) => {
      const separatorIndex = entry.indexOf("=");

      if (separatorIndex <= 0) {
        return cookies;
      }

      const key = entry.slice(0, separatorIndex).trim();
      const value = entry.slice(separatorIndex + 1).trim();
      cookies[key] = decodeURIComponent(value);
      return cookies;
    }, {});
}

function extractTokenFromCookieHeader(headerValue) {
  const cookies = parseCookieHeader(headerValue);
  return cookies[AUTH_COOKIE_NAME] || null;
}

module.exports = {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  extractTokenFromCookieHeader,
  signAuthToken,
  verifyAuthToken
};
