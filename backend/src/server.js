const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const { testConnection } = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const questionRoutes = require("./routes/questionRoutes");
const { initializeSocket } = require("./socket");
const userRoutes = require("./routes/userRoutes");

const app = express();
const httpServer = http.createServer(app);
const port = Number(process.env.PORT || 3000);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by CORS"));
    }
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/questions", questionRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.status || error.statusCode || 500;
  const message = error.message || "Internal server error";

  console.error(`[Error] ${statusCode} - ${message}`);
  if (statusCode === 500) {
    console.error(error.stack);
  }

  res.status(statusCode).json({
    status: "error",
    statusCode,
    message,
    error: message // Providing both message and error fields for compatibility
  });
});

async function bootstrap() {
  await testConnection();
  console.log(
    `MySQL connection established (${process.env.DB_HOST || "localhost"}/${process.env.DB_NAME || "campus_connect"})`
  );
  initializeSocket(httpServer, allowedOrigins);
  httpServer.listen(port, () => {
    console.log(`Campus Connect API listening on port ${port}`);
  });
}

bootstrap().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
