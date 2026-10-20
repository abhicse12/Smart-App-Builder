// Base URL of the App Builder backend, e.g. "https://api.example.com".
// Set VITE_API_URL in frontend/.env; defaults to the local backend.
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");
