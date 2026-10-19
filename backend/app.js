import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import generationRoutes from "./routes/generationRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
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