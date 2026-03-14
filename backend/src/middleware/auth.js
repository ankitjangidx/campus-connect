const { AUTH_COOKIE_NAME, verifyAuthToken } = require("../utils/auth");

function normalizeId(value, label) {
  const id = Number.parseInt(value, 10);

  if (Number.isNaN(id) || id <= 0) {
    const error = new Error(`Invalid ${label}`);
    error.statusCode = 400;
    throw error;
  }

  return id;
}

function requireAuth(req, _res, next) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (!token) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const payload = verifyAuthToken(token);
    req.auth = {
      userId: normalizeId(payload.sub, "authenticated user id")
    };
    next();
  } catch (error) {
    error.statusCode = error.statusCode || 401;
    next(error);
  }
}

function requireSelfParam(paramName = "id") {
  return function enforceSelfAccess(req, _res, next) {
    try {
      const routeUserId = normalizeId(req.params[paramName], `${paramName} parameter`);

      if (routeUserId !== req.auth?.userId) {
        const error = new Error("You are not allowed to access that resource");
        error.statusCode = 403;
        throw error;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  requireAuth,
  requireSelfParam
};
