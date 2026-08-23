import dotenv from "dotenv";

dotenv.config();

import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

console.log(
  "Gemini API Key:",
  process.env.GEMINI_API_KEY ? "LOADED" : "NOT LOADED"
);

connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});