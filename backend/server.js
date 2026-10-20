import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

// =====================================
// Check configuration before starting
// =====================================

const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];

const missingEnv = REQUIRED_ENV.filter(
  (name) => !process.env[name]?.trim()
);

if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variable(s): ${missingEnv.join(", ")}. ` +
      "Set them in backend/.env (see backend/.env.example)."
  );
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn(
    "Warning: JWT_SECRET is shorter than 32 characters. Use a long random value."
  );
}

console.log(
  "Gemini API Key:",
  process.env.GEMINI_API_KEY ? "LOADED" : "NOT LOADED"
);

console.log(
  "Groq API Key:",
  process.env.GROQ_API_KEY ? "LOADED" : "NOT LOADED"
);

if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
  console.warn(
    "Warning: neither GEMINI_API_KEY nor GROQ_API_KEY is set; application generation will fail."
  );
}

// =====================================
// Connect to MongoDB, then accept requests
// (connectDB exits the process if the connection fails)
// =====================================

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
