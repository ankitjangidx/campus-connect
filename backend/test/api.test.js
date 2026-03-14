const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const test = require("node:test");

const express = require("express");
const httpMocks = require("node-mocks-http");

const { AUTH_COOKIE_NAME, signAuthToken } = require("../src/utils/auth");

const MODULES_TO_RESET = [
  "../src/controllers/authController",
  "../src/controllers/questionController",
  "../src/controllers/userController",
  "../src/routes/authRoutes",
  "../src/routes/questionRoutes",
  "../src/routes/userRoutes"
];

function defaultAsyncMock(name) {
  return async () => {
    throw new Error(`Unexpected call to ${name}`);
  };
}

function createServiceMocks(overrides = {}) {
  return {
    acceptConnectionRequest: defaultAsyncMock("acceptConnectionRequest"),
    acceptConnectionRequestWithNotification: defaultAsyncMock(
      "acceptConnectionRequestWithNotification"
    ),
    rejectConnectionRequestWithNotification: defaultAsyncMock(
      "rejectConnectionRequestWithNotification"
    ),
    createConnection: defaultAsyncMock("createConnection"),
    createConnectionWithNotification: defaultAsyncMock("createConnectionWithNotification"),
    createMessage: defaultAsyncMock("createMessage"),
    createMessageNotification: async () => null,
    createQuestion: defaultAsyncMock("createQuestion"),
    createQuestionComment: defaultAsyncMock("createQuestionComment"),
    createQuestionCommentNotifications: async () => [],
    deleteQuestionComment: defaultAsyncMock("deleteQuestionComment"),
    getConversation: defaultAsyncMock("getConversation"),
    getDashboardData: defaultAsyncMock("getDashboardData"),
    getEditableProfile: defaultAsyncMock("getEditableProfile"),
    getPublicUserProfile: defaultAsyncMock("getPublicUserProfile"),
    getSessionUserById: defaultAsyncMock("getSessionUserById"),
    listConnections: defaultAsyncMock("listConnections"),
    listConnectionRequests: defaultAsyncMock("listConnectionRequests"),
    listMentorships: defaultAsyncMock("listMentorships"),
    listNotifications: async () => ({ items: [], unreadCount: 0 }),
    listQuestionComments: defaultAsyncMock("listQuestionComments"),
    listQuestionCommentsForViewer: defaultAsyncMock("listQuestionCommentsForViewer"),
    listQuestions: defaultAsyncMock("listQuestions"),
    listUsers: defaultAsyncMock("listUsers"),
    loginUser: defaultAsyncMock("loginUser"),
    markConversationRead: async () => ({ readIds: [], unreadCount: 0 }),
    markNotificationsRead: async () => ({ readIds: [], unreadCount: 0 }),
    markQuestionNotificationsRead: async () => ({ readIds: [], unreadCount: 0 }),
    registerUser: defaultAsyncMock("registerUser"),
    requestRegistrationOtp: defaultAsyncMock("requestRegistrationOtp"),
    resolveQuestionComment: defaultAsyncMock("resolveQuestionComment"),
    updateQuestionComment: defaultAsyncMock("updateQuestionComment"),
    updateProfile: defaultAsyncMock("updateProfile"),
    ...overrides
  };
}

function resetLoadedModules() {
  MODULES_TO_RESET.forEach((relativePath) => {
    delete require.cache[require.resolve(relativePath)];
  });
}

function createTestApp({ dataService = {}, socket = {} } = {}) {
  resetLoadedModules();

  const mockedDataService = createServiceMocks(dataService);
  const mockedSocket = {
    emitToUsers() {},
    ...socket
  };

  require.cache[require.resolve("../src/services/dataService")] = {
    id: require.resolve("../src/services/dataService"),
    filename: require.resolve("../src/services/dataService"),
    loaded: true,
    exports: mockedDataService
  };

  require.cache[require.resolve("../src/socket")] = {
    id: require.resolve("../src/socket"),
    filename: require.resolve("../src/socket"),
    loaded: true,
    exports: mockedSocket
  };

  const authRoutes = require("../src/routes/authRoutes");
  const userRoutes = require("../src/routes/userRoutes");
  const questionRoutes = require("../src/routes/questionRoutes");

  const app = express();
  app.use((req, _res, next) => {
    const rawCookieHeader = req.headers.cookie || "";
    req.cookies = rawCookieHeader
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

    if (typeof req.body === "undefined") {
      req.body = {};
    }

    next();
  });
  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/questions", questionRoutes);
  app.use((_req, res) => {
    res.status(404).json({ message: "Route not found" });
  });
  app.use((error, _req, res, _next) => {
    res.status(error.statusCode || 500).json({
      message: error.message || "Internal server error"
    });
  });

  return {
    app,
    mockedDataService,
    mockedSocket
  };
}

function authCookie(userId = 1) {
  return `${AUTH_COOKIE_NAME}=${signAuthToken(userId)}`;
}

async function dispatch(app, method, url, headers, body) {
  const req = httpMocks.createRequest({
    method,
    url,
    headers,
    body
  });

  const res = httpMocks.createResponse({
    eventEmitter: EventEmitter
  });

  return await new Promise((resolve, reject) => {
    res.on("end", () => {
      const rawBody = res._getData();
      const contentType = String(res.getHeader("content-type") || "");
      let parsedBody = rawBody;

      if (contentType.includes("application/json") && typeof rawBody === "string") {
        parsedBody = JSON.parse(rawBody);
      }

      resolve({
        status: res.statusCode,
        body: parsedBody,
        headers: {
          ...Object.fromEntries(
          Object.entries(res._getHeaders()).map(([key, value]) => [key.toLowerCase(), value])
          ),
          "set-cookie": res.getHeader("set-cookie") || res.getHeader("Set-Cookie")
        }
      });
    });

    app.handle(req, res, reject);
  });
}

class TestRequest {
  constructor(app, method, url) {
    this.app = app;
    this.method = method;
    this.url = url;
    this.headers = {};
    this.body = undefined;
    this.promise = null;
  }

  set(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  send(body) {
    this.body = body;
    this.headers["content-type"] = "application/json";
    return this.execute();
  }

  execute() {
    if (!this.promise) {
      this.promise = dispatch(this.app, this.method, this.url, this.headers, this.body);
    }

    return this.promise;
  }

  then(onFulfilled, onRejected) {
    return this.execute().then(onFulfilled, onRejected);
  }

  catch(onRejected) {
    return this.execute().catch(onRejected);
  }

  finally(onFinally) {
    return this.execute().finally(onFinally);
  }
}

function request(app) {
  return {
    get(url) {
      return new TestRequest(app, "GET", url);
    },
    post(url) {
      return new TestRequest(app, "POST", url);
    },
    put(url) {
      return new TestRequest(app, "PUT", url);
    },
    delete(url) {
      return new TestRequest(app, "DELETE", url);
    }
  };
}

test("POST /api/auth/login returns the user and sets the auth cookie", async () => {
  let receivedPayload;
  const { app } = createTestApp({
    dataService: {
      async loginUser(payload) {
        receivedPayload = payload;
        return { id: 7, username: "session-user" };
      }
    }
  });

  const response = await request(app).post("/api/auth/login").send({
    identifier: "session-user",
    password: "example-password"
  });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    user: { id: 7, username: "session-user" }
  });
  assert.deepEqual(receivedPayload, {
    identifier: "session-user",
    password: "example-password"
  });
});

test("POST /api/auth/request-otp proxies to the OTP service", async () => {
  const { app } = createTestApp({
    dataService: {
      async requestRegistrationOtp(payload) {
        assert.deepEqual(payload, { email: "user@example.com" });
        return { email: payload.email, expiresAt: "2026-03-14T12:00:00.000Z" };
      }
    }
  });

  const response = await request(app)
    .post("/api/auth/request-otp")
    .send({ email: "user@example.com" });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    email: "user@example.com",
    expiresAt: "2026-03-14T12:00:00.000Z"
  });
});

test("POST /api/auth/register returns the new user and sets the auth cookie", async () => {
  let receivedPayload;
  const { app } = createTestApp({
    dataService: {
      async registerUser(payload) {
        receivedPayload = payload;
        return { id: 8, username: "new-user" };
      }
    }
  });

  const response = await request(app).post("/api/auth/register").send({
    username: "new-user",
    userId: "cc-12",
    email: "new@example.com",
    password: "secret",
    otpCode: "123456"
  });

  assert.equal(response.status, 201);
  assert.equal(receivedPayload.email, "new@example.com");
  assert.deepEqual(response.body, {
    user: { id: 8, username: "new-user" }
  });
});

test("GET /api/auth/me returns the current session user from the cookie", async () => {
  const { app } = createTestApp({
    dataService: {
      async getSessionUserById(userId) {
        assert.equal(userId, 11);
        return { id: 11, username: "session-user" };
      }
    }
  });

  const response = await request(app)
    .get("/api/auth/me")
    .set("Cookie", authCookie(11));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    user: { id: 11, username: "session-user" }
  });
});

test("GET /api/auth/me rejects unauthenticated requests", async () => {
  const { app } = createTestApp();
  const response = await request(app).get("/api/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.message, "Authentication required");
});

test("POST /api/auth/logout clears the auth cookie", async () => {
  const { app } = createTestApp();
  const response = await request(app).post("/api/auth/logout");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
});

test("GET /api/users lists users and defaults exclusion to the authenticated user", async () => {
  const { app } = createTestApp({
    dataService: {
      async listUsers({ excludeUserId }) {
        assert.equal(excludeUserId, 5);
        return [{ id: 6, username: "mentor" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/users")
    .set("Cookie", authCookie(5));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 6, username: "mentor" }]);
});

test("GET /api/users/:id/dashboard returns the authenticated user's dashboard", async () => {
  const { app } = createTestApp({
    dataService: {
      async getDashboardData(userId) {
        assert.equal(userId, "5");
        return { stats: { peopleMentored: 2 } };
      }
    }
  });

  const response = await request(app)
    .get("/api/users/5/dashboard")
    .set("Cookie", authCookie(5));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { stats: { peopleMentored: 2 } });
});

test("GET /api/users/:id/dashboard rejects access to another user's self route", async () => {
  const { app } = createTestApp();
  const response = await request(app)
    .get("/api/users/99/dashboard")
    .set("Cookie", authCookie(5));

  assert.equal(response.status, 403);
  assert.equal(response.body.message, "You are not allowed to access that resource");
});

test("GET /api/users/:id/profile returns the editable profile", async () => {
  const { app } = createTestApp({
    dataService: {
      async getEditableProfile(userId) {
        assert.equal(userId, "4");
        return { id: 4, personal: { firstName: "Aarav" } };
      }
    }
  });

  const response = await request(app)
    .get("/api/users/4/profile")
    .set("Cookie", authCookie(4));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 4, personal: { firstName: "Aarav" } });
});

test("GET /api/users/:id/notifications returns the user's notification feed", async () => {
  const { app } = createTestApp({
    dataService: {
      async listNotifications(userId) {
        assert.equal(userId, "4");
        return {
          items: [{ id: 21, type: "message", title: "New message" }],
          unreadCount: 1
        };
      }
    }
  });

  const response = await request(app)
    .get("/api/users/4/notifications")
    .set("Cookie", authCookie(4));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    items: [{ id: 21, type: "message", title: "New message" }],
    unreadCount: 1
  });
});

test("POST /api/users/:id/notifications/read marks selected notifications as read", async () => {
  let emittedPayload;
  const { app } = createTestApp({
    dataService: {
      async markNotificationsRead(payload) {
        assert.deepEqual(payload, {
          userId: "4",
          notificationIds: [21, 22]
        });
        return {
          readIds: [21, 22],
          unreadCount: 0
        };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayload = { userIds, eventName, payload };
      }
    }
  });

  const response = await request(app)
    .post("/api/users/4/notifications/read")
    .set("Cookie", authCookie(4))
    .send({ notificationIds: [21, 22] });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    readIds: [21, 22],
    unreadCount: 0
  });
  assert.deepEqual(emittedPayload, {
    userIds: [4],
    eventName: "notification:read",
    payload: {
      readIds: [21, 22],
      unreadCount: 0
    }
  });
});

test("PUT /api/users/:id/profile updates the authenticated user's profile", async () => {
  const profilePayload = { personal: { firstName: "Ankit" } };
  const { app } = createTestApp({
    dataService: {
      async updateProfile(userId, payload) {
        assert.equal(userId, "4");
        assert.deepEqual(payload, profilePayload);
        return { id: 4, personal: { firstName: "Ankit" } };
      }
    }
  });

  const response = await request(app)
    .put("/api/users/4/profile")
    .set("Cookie", authCookie(4))
    .send(profilePayload);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 4, personal: { firstName: "Ankit" } });
});

test("GET /api/users/:id/connections returns the current user's connections", async () => {
  const { app } = createTestApp({
    dataService: {
      async listConnections(userId) {
        assert.equal(userId, "3");
        return [{ id: 8, username: "peer" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/users/3/connections")
    .set("Cookie", authCookie(3));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 8, username: "peer" }]);
});

test("GET /api/users/:id/connection-requests returns incoming and outgoing requests", async () => {
  const { app } = createTestApp({
    dataService: {
      async listConnectionRequests(userId) {
        assert.equal(userId, "3");
        return {
          incoming: [{ id: 12, username: "neha24", direction: "incoming" }],
          outgoing: [{ id: 13, username: "ananya25", direction: "outgoing" }]
        };
      }
    }
  });

  const response = await request(app)
    .get("/api/users/3/connection-requests")
    .set("Cookie", authCookie(3));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    incoming: [{ id: 12, username: "neha24", direction: "incoming" }],
    outgoing: [{ id: 13, username: "ananya25", direction: "outgoing" }]
  });
});

test("POST /api/users/:id/connections creates a connection", async () => {
  let emittedPayload;
  const { app } = createTestApp({
    dataService: {
      async createConnectionWithNotification(userId, targetUserId) {
        assert.equal(userId, "3");
        assert.equal(targetUserId, 8);
        return {
          connection: { id: 8, username: "peer", status: "pending", direction: "outgoing" },
          notification: { id: 31, userId: 8, type: "connection_request", title: "Request" },
          recipientUserId: 8
        };
      },
      async listNotifications(userId) {
        assert.equal(userId, 8);
        return { items: [], unreadCount: 2 };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayload = { userIds, eventName, payload };
      }
    }
  });

  const response = await request(app)
    .post("/api/users/3/connections")
    .set("Cookie", authCookie(3))
    .send({ targetUserId: 8 });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, {
    id: 8,
    username: "peer",
    status: "pending",
    direction: "outgoing"
  });
  assert.deepEqual(emittedPayload, {
    userIds: [8],
    eventName: "notification:created",
    payload: {
      notification: { id: 31, userId: 8, type: "connection_request", title: "Request" },
      unreadCount: 2
    }
  });
});

test("POST /api/users/:id/connection-requests/:requestId/accept accepts a pending request", async () => {
  let emittedPayload;
  const { app } = createTestApp({
    dataService: {
      async acceptConnectionRequestWithNotification(userId, requestId) {
        assert.equal(userId, "3");
        assert.equal(requestId, "12");
        return {
          connection: { id: 2, username: "neha24", status: "accepted" },
          notification: { id: 41, userId: 9, type: "connection_accepted", title: "Accepted" },
          recipientUserId: 9
        };
      },
      async listNotifications(userId) {
        assert.equal(userId, 9);
        return { items: [], unreadCount: 1 };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayload = { userIds, eventName, payload };
      }
    }
  });

  const response = await request(app)
    .post("/api/users/3/connection-requests/12/accept")
    .set("Cookie", authCookie(3))
    .send({});

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 2, username: "neha24", status: "accepted" });
  assert.deepEqual(emittedPayload, {
    userIds: [9],
    eventName: "notification:created",
    payload: {
      notification: { id: 41, userId: 9, type: "connection_accepted", title: "Accepted" },
      unreadCount: 1
    }
  });
});

test("POST /api/users/:id/connection-requests/:requestId/reject rejects a pending request", async () => {
  let emittedPayload;
  const { app } = createTestApp({
    dataService: {
      async rejectConnectionRequestWithNotification(userId, requestId) {
        assert.equal(userId, "3");
        assert.equal(requestId, "12");
        return {
          ok: true,
          notification: { id: 55, userId: 9, type: "connection_rejected", title: "Rejected" },
          recipientUserId: 9
        };
      },
      async listNotifications(userId) {
        assert.equal(userId, 9);
        return { items: [], unreadCount: 1 };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayload = { userIds, eventName, payload };
      }
    }
  });

  const response = await request(app)
    .post("/api/users/3/connection-requests/12/reject")
    .set("Cookie", authCookie(3))
    .send({});

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { ok: true });
  assert.deepEqual(emittedPayload, {
    userIds: [9],
    eventName: "notification:created",
    payload: {
      notification: { id: 55, userId: 9, type: "connection_rejected", title: "Rejected" },
      unreadCount: 1
    }
  });
});

test("GET /api/users/:id/messages/:peerId returns a conversation", async () => {
  const { app } = createTestApp({
    dataService: {
      async getConversation(userId, peerId) {
        assert.equal(userId, "3");
        assert.equal(peerId, "8");
        return { peer: { id: 8 }, messages: [{ id: 1, body: "Hi" }] };
      },
      async markConversationRead(userId, peerId) {
        assert.equal(userId, "3");
        assert.equal(peerId, "8");
        return {
          readIds: [51],
          unreadCount: 2
        };
      }
    },
    socket: {
      emitToUsers() {}
    }
  });

  const response = await request(app)
    .get("/api/users/3/messages/8")
    .set("Cookie", authCookie(3));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    peer: { id: 8 },
    messages: [{ id: 1, body: "Hi" }]
  });
});

test("POST /api/users/:id/messages/:peerId creates a message and emits it to both users", async () => {
  let emittedPayload;
  const { app } = createTestApp({
    dataService: {
      async createMessage(userId, peerId, body) {
        assert.equal(userId, "3");
        assert.equal(peerId, "8");
        assert.equal(body, "Hello");
        return {
          id: 11,
          senderId: 3,
          recipientId: 8,
          body: "Hello",
          createdAt: "2026-03-14T12:00:00.000Z"
        };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayload = { userIds, eventName, payload };
      }
    }
  });

  const response = await request(app)
    .post("/api/users/3/messages/8")
    .set("Cookie", authCookie(3))
    .send({ body: "Hello" });

  assert.equal(response.status, 201);
  assert.equal(response.body.id, 11);
  assert.deepEqual(emittedPayload, {
    userIds: [3, 8],
    eventName: "message:created",
    payload: {
      id: 11,
      senderId: 3,
      recipientId: 8,
      body: "Hello",
      createdAt: "2026-03-14T12:00:00.000Z"
    }
  });
});

test("GET /api/users/:id/questions returns the current user's questions", async () => {
  const { app } = createTestApp({
    dataService: {
      async listQuestions({ userId }) {
        assert.equal(userId, "7");
        return [{ id: 1, title: "Question" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/users/7/questions")
    .set("Cookie", authCookie(7));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 1, title: "Question" }]);
});

test("GET /api/users/:id/mentorships returns the authenticated user's mentorships", async () => {
  const { app } = createTestApp({
    dataService: {
      async listMentorships(userId) {
        assert.equal(userId, "7");
        return [{ id: 2, menteeName: "Priya" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/users/7/mentorships")
    .set("Cookie", authCookie(7));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 2, menteeName: "Priya" }]);
});

test("GET /api/users/:id returns a public user profile", async () => {
  const { app } = createTestApp({
    dataService: {
      async getPublicUserProfile(userId) {
        assert.equal(userId, "9");
        return { id: 9, username: "public-user" };
      }
    }
  });

  const response = await request(app)
    .get("/api/users/9")
    .set("Cookie", authCookie(1));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 9, username: "public-user" });
});

test("GET /api/questions lists questions for authenticated users", async () => {
  const { app } = createTestApp({
    dataService: {
      async listQuestions() {
        return [{ id: 10, title: "Forum question" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/questions")
    .set("Cookie", authCookie(2));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 10, title: "Forum question" }]);
});

test("POST /api/questions creates a question with the authenticated user id", async () => {
  const { app } = createTestApp({
    dataService: {
      async createQuestion(payload) {
        assert.deepEqual(payload, {
          userId: 2,
          title: "Need help",
          description: "How do I prepare?",
          category: "career"
        });
        return { id: 10, title: payload.title };
      }
    }
  });

  const response = await request(app)
    .post("/api/questions")
    .set("Cookie", authCookie(2))
    .send({
      userId: 999,
      title: "Need help",
      description: "How do I prepare?",
      category: "career"
    });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { id: 10, title: "Need help" });
});

test("GET /api/questions/:id/comments returns nested comments", async () => {
  const { app } = createTestApp({
    dataService: {
      async listQuestionCommentsForViewer(questionId, viewerUserId) {
        assert.equal(questionId, "10");
        assert.equal(viewerUserId, 2);
        return [{ id: 1, body: "Top-level" }];
      }
    }
  });

  const response = await request(app)
    .get("/api/questions/10/comments")
    .set("Cookie", authCookie(2));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, [{ id: 1, body: "Top-level" }]);
});

test("POST /api/questions/:id/comments creates a comment with the authenticated user id", async () => {
  const emittedPayloads = [];
  const { app } = createTestApp({
    dataService: {
      async createQuestionComment(payload) {
        assert.deepEqual(payload, {
          questionId: "10",
          userId: 2,
          parentId: 4,
          body: "Replying"
        });
        return { id: 3, body: "Replying" };
      },
      async createQuestionCommentNotifications(commentId) {
        assert.equal(commentId, 3);
        return [
          {
            id: 91,
            userId: 7,
            type: "comment_reply",
            title: "New reply"
          }
        ];
      },
      async listNotifications(userId) {
        assert.equal(userId, 7);
        return {
          items: [],
          unreadCount: 4
        };
      }
    },
    socket: {
      emitToUsers(userIds, eventName, payload) {
        emittedPayloads.push({ userIds, eventName, payload });
      }
    }
  });

  const response = await request(app)
    .post("/api/questions/10/comments")
    .set("Cookie", authCookie(2))
    .send({
      userId: 999,
      parentId: 4,
      body: "Replying"
    });

  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { id: 3, body: "Replying" });
  assert.deepEqual(emittedPayloads, [
    {
      userIds: [7],
      eventName: "notification:created",
      payload: {
        notification: {
          id: 91,
          userId: 7,
          type: "comment_reply",
          title: "New reply"
        },
        unreadCount: 4
      }
    }
  ]);
});

test("PUT /api/questions/:id/comments/:commentId edits a comment for its author", async () => {
  const { app } = createTestApp({
    dataService: {
      async updateQuestionComment(payload) {
        assert.deepEqual(payload, {
          questionId: "10",
          commentId: "3",
          userId: 2,
          body: "Edited body"
        });
        return { id: 3, body: "Edited body", isEdited: true };
      }
    }
  });

  const response = await request(app)
    .put("/api/questions/10/comments/3")
    .set("Cookie", authCookie(2))
    .send({ body: "Edited body" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 3, body: "Edited body", isEdited: true });
});

test("DELETE /api/questions/:id/comments/:commentId deletes a comment for its author", async () => {
  const { app } = createTestApp({
    dataService: {
      async deleteQuestionComment(payload) {
        assert.deepEqual(payload, {
          questionId: "10",
          commentId: "3",
          userId: 2
        });
        return { id: 3, body: "[deleted]", isDeleted: true };
      }
    }
  });

  const response = await request(app)
    .delete("/api/questions/10/comments/3")
    .set("Cookie", authCookie(2));

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { id: 3, body: "[deleted]", isDeleted: true });
});

test("POST /api/questions/:id/resolve resolves a comment with the authenticated user id", async () => {
  const { app } = createTestApp({
    dataService: {
      async resolveQuestionComment(payload) {
        assert.deepEqual(payload, {
          questionId: "10",
          resolverUserId: 2,
          commentId: 6
        });
        return { id: 10, resolved: true, resolvedCommentId: 6 };
      }
    }
  });

  const response = await request(app)
    .post("/api/questions/10/resolve")
    .set("Cookie", authCookie(2))
    .send({
      resolverUserId: 999,
      commentId: 6
    });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    id: 10,
    resolved: true,
    resolvedCommentId: 6
  });
});
