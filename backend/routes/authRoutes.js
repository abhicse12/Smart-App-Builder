import express from "express";
import { rateLimit } from "express-rate-limit";

import {
  signup,
  login,
  getMe,
  logout,
} from "../controllers/authController.js";

import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Slow down password guessing: only failed logins count
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many failed login attempts. Please try again in 15 minutes.",
  },
});

// Limit account creation per IP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many accounts created. Please try again later.",
  },
});

router.post("/signup", signupLimiter, signup);
router.post("/login", loginLimiter, login);
router.get("/me", authMiddleware, getMe);
router.post("/logout", logout);

export default router;