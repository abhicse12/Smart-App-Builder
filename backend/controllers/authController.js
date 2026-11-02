import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
// bcrypt only uses the first 72 bytes; cap length to avoid abuse
const MAX_PASSWORD_LENGTH = 128;

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim().length > 0;

// Auth cookie attributes shared by login and logout. `secure` (HTTPS
// only) is enabled in production; local development runs on http.
const authCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
});

// Start a session: sign the JWT and store it in the HttpOnly cookie
const setAuthCookie = (res, user) => {
  const token = jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie("token", token, {
    ...authCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// ==============================
// SIGNUP
// ==============================

export const signup = async (req, res) => {
  try {
    // req.body is undefined in Express 5 when the request is not JSON
    const { name, email, password } = req.body ?? {};

    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(email) ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    if (
      password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({
        success: false,
        message: `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`,
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    // Signup ke baad direct authentication nahi karni
    // User ko Login page par bhejna hai
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Signup Error:", error);

    res.status(500).json({
      success: false,
      message: "Signup failed",
    });
  }
};

// ==============================
// LOGIN
// ==============================

export const login = async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    // Strings only: rejects objects such as {"$gt": ""}
    if (
      !isNonEmptyString(email) ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    // Google-only accounts have no password to compare against
    if (!user?.password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // JWT ko HttpOnly Cookie mein store karo
    setAuthCookie(res, user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

// ==============================
// GOOGLE LOGIN
// ==============================

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body ?? {};

    if (!isNonEmptyString(credential)) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required",
      });
    }

    // Read here, not at import time: server.js loads .env after its
    // imports. Without an audience, tokens issued to any other Google
    // app would be accepted, so it must never be left empty.
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();

    if (!clientId) {
      console.error("Google Login Error: GOOGLE_CLIENT_ID is not set");

      return res.status(503).json({
        success: false,
        message: "Google login is not configured",
      });
    }

    let payload;

    try {
      // Checks Google's signature, the expiry and that the token was
      // issued for this app
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      payload = ticket.getPayload();
    } catch (error) {
      console.error("Google token rejected:", error.message);

      return res.status(401).json({
        success: false,
        message: "Google sign-in failed",
      });
    }

    const { sub, email, name, email_verified: emailVerified } = payload;

    // An unverified email must never give access to an existing account
    if (!email || !emailVerified) {
      return res.status(401).json({
        success: false,
        message: "Your Google email is not verified",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    let user = await User.findOne({ googleId: sub });

    if (!user) {
      user = await User.findOne({ email: normalizedEmail });

      if (user) {
        // Same person signed up with a password earlier: link Google
        user.googleId = sub;
        await user.save();
      } else {
        user = await User.create({
          name: name?.trim() || normalizedEmail.split("@")[0],
          email: normalizedEmail,
          googleId: sub,
        });
      }
    }

    setAuthCookie(res, user);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Google Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};

// ==============================
// GET CURRENT USER
// ==============================

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Get Me Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to get user",
    });
  }
};

// ==============================
// LOGOUT
// ==============================

export const logout = async (req, res) => {
  try {
    // Same attributes as when the cookie was set, or it is not removed
    res.clearCookie("token", authCookieOptions());

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout Error:", error);

    res.status(500).json({
      success: false,
      message: "Logout failed",
    });
  }
};