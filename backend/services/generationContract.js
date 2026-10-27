// Conventions every generated full-stack project must follow.
//
// The Architect, Coder and Fixer agents work on different files at
// different times. Without one shared contract each batch guesses the
// API paths, request fields and token handling, and the frontend and
// backend stop matching (e.g. frontend posts { email } to /auth/login
// while the backend expects { username } on /api/auth/login).
//
// These rules take priority over RAG documents.

import { detectTechAreas } from "./techStackMatcher.js";

// The conventions describe an Express backend behind the Vite proxy
export const usesApiConventions = (techStack = []) => {
  const areas = detectTechAreas(techStack);
  return areas.has("node-express") || areas.has("mern");
};

export const API_CONVENTIONS = `
==================================================
API CONTRACT CONVENTIONS (MANDATORY - OVERRIDE RAG)
==================================================

These conventions are fixed. They take priority over any retrieved
knowledge. Frontend and backend files are generated in separate
batches, so both sides MUST follow them exactly.

1. API base path
   - Every backend API route is mounted under /api
     (app.use("/api/<resource>", <resource>Routes)).
   - The backend health check is GET /health (not under /api).
   - The backend listens on process.env.PORT || 5001, host 0.0.0.0.
   - frontend/vite.config.js proxies "/api" to http://localhost:5001.

2. Frontend API client
   - frontend/src/services/api.js exports ONE axios instance:
       axios.create({ baseURL: "/api" })
   - Components and services call it WITHOUT the /api prefix:
       api.post("/auth/login", { email, password })
       api.get("/tasks")
   - Never call fetch()/axios with a full URL or a path that does not
     go through the client. Never use a baseURL other than "/api".

3. Authentication API (when the app has login)
   - POST /api/auth/signup
       body:     { name, email, password }
       201 JSON: { token, user: { _id, name, email } }
       400 JSON: { message } for missing fields or an existing email
   - POST /api/auth/login
       body:     { email, password }
       200 JSON: { token, user: { _id, name, email } }
       401 JSON: { message: "Invalid email or password" }
   - GET /api/auth/me    (protected)
       200 JSON: { user: { _id, name, email } }
   - Users log in with EMAIL. Do not use "username" as the login field.
   - Never return the password hash.

4. Token handling (Bearer token, NO cookies)
   - The backend signs a JWT and returns it in the JSON body as "token".
     Do NOT use cookies or cookie-parser for authentication.
   - The JWT secret is defined ONCE, in backend/config/jwt.js:
       const JWT_SECRET = process.env.JWT_SECRET || "dev-jwt-secret";
       module.exports = { JWT_SECRET };
     authController (jwt.sign) and authMiddleware (jwt.verify) both
     import JWT_SECRET from it. Never write a second fallback string:
     different fallbacks make every token fail verification.
   - Tokens are signed with the payload { _id: user._id }.
   - Auth middleware reads the token from
       req.headers.authorization ("Bearer <token>")
     verifies it with the same JWT_SECRET and sets
       req.user = { _id: decoded._id }
     Controllers read the user id as req.user._id.
   - The frontend stores the token in localStorage under "token" and
     the api client adds "Authorization: Bearer <token>" to every
     request (axios request interceptor).
   - cors() is used without credentials (no cookies are involved).

5. Frontend auth state
   - frontend/src/context/AuthContext.jsx exports exactly these named
     exports: AuthContext, AuthProvider, useAuth.
       export const AuthContext = createContext(null);
       export const AuthProvider = ({ children }) => { ... };
       export const useAuth = () => useContext(AuthContext);
   - Pages and components get auth with: const { user, login, logout } = useAuth();
   - Auth state lives in React state (useState inside AuthProvider),
     NOT in a value read once from localStorage during render.
   - login() saves the token and user to localStorage AND updates the
     state, so protected routes re-render immediately after login.
   - Protected routes read the auth state from the context.
   - logout() clears localStorage and the state.

6. Record ids
   - Every stored record has an "_id" string field in BOTH persistence
     modes (Mongoose _id, or a generated id in JSON mode). Use _id
     everywhere; never mix "id" and "_id".
   - Records owned by a user store the owner's _id, and queries filter
     by it.

7. Responses
   - Errors are JSON: { message }.
   - Other endpoints return the shapes listed in the API contract.
     The frontend reads exactly those shapes.

8. Imports and exports across files
   - Only import names that the target file really exports (see
     "MODULES ALREADY GENERATED" when present). A missing named export
     makes the browser refuse the module and the page renders blank.
   - React components and pages use "export default"; shared hooks,
     contexts and helpers use named exports.
`;

// Formats the Architect's apiContract (if any) for the Coder/Fixer prompt
export const formatApiContract = (apiContract) => {
  if (!Array.isArray(apiContract) || apiContract.length === 0) {
    return "No endpoint list was provided by the Architect. Follow the API CONTRACT CONVENTIONS.";
  }

  return apiContract
    .map((endpoint) => {
      const lines = [
        `${String(endpoint.method || "GET").toUpperCase()} ${endpoint.path}` +
          (endpoint.auth ? "   (requires Bearer token)" : ""),
      ];

      if (endpoint.description) {
        lines.push(`  purpose:  ${endpoint.description}`);
      }

      if (endpoint.body) {
        lines.push(`  body:     ${JSON.stringify(endpoint.body)}`);
      }

      if (endpoint.response) {
        lines.push(`  response: ${JSON.stringify(endpoint.response)}`);
      }

      return lines.join("\n");
    })
    .join("\n\n");
};
