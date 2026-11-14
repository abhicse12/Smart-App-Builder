import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import generationRoutes from "./routes/generationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

const app = express();

// Behind a reverse proxy (Caddy on the server): use the client's address and
// protocol from X-Forwarded-* headers. Only the first proxy is trusted.
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

// Frontend origin(s) allowed to call the API with cookies.
// CLIENT_URL may hold several origins separated by commas.
const allowedOrigins = (
  process.env.CLIENT_URL || "http://localhost:5173"
)
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/generate", generationRoutes);

// Test route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "AI App Builder Backend is running 🚀",
  });
});

export default app;