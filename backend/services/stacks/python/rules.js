// Shared rules for the Architect, Coder, Fixer and Modify prompts of
// Python full-stack projects. These override retrieved RAG knowledge.

import { LOCKED_PATHS } from "./templates.js";

export const PROJECT_RULES = `
==================================================
PYTHON FULL-STACK RULES (MANDATORY - OVERRIDE ANY OTHER KNOWLEDGE)
==================================================

Stack: Python 3.12 + FastAPI backend, React 19 + Vite + Tailwind CSS 4
frontend. Data is stored in JSON files, because the app has no database
server. Do not use MongoDB, SQL, Node.js or Express, even if the user
selected a database.

FIXED FILES ALREADY EXIST. Never create or change them:
${LOCKED_PATHS.map((filePath) => `- ${filePath}`).join("\n")}

Starter files that also exist (change them only if the user asks):
- frontend/src/pages/Login.jsx, frontend/src/pages/Signup.jsx
- frontend/src/index.css

Signup, login, logout, password hashing and JWT are ALREADY COMPLETE.
Never write authentication code. POST /api/auth/signup, POST
/api/auth/login and GET /api/auth/me already exist.

BACKEND (the code you write)

- Routers: backend/app/routers/<resource>.py. Each one is registered
  automatically and must define:
    router = APIRouter(prefix="/api/<resource>", tags=["<Resource>"])
  Never edit main.py. Use plain "def" route functions, not "async def".
- Schemas: backend/app/schemas/<resource>.py (Pydantic BaseModel).
- Optional logic: backend/app/services/<resource>.py.
- Allowed imports: Python standard library, fastapi, pydantic and app.*
  only. requirements.txt is fixed, so no other packages exist.
- Protect a route and get the user:
    from fastapi import APIRouter, Depends, HTTPException
    from app.dependencies.auth import get_current_user
    def list_tasks(current_user: dict = Depends(get_current_user)): ...
  current_user is { "_id", "name", "email" }.
- Store data ONLY through this class:
    from app.storage.json_store import JsonCollection
    tasks = JsonCollection("tasks")     # backend/data/tasks.json
    tasks.all()                         # list of dicts
    tasks.find(lambda r: r["userId"] == current_user["_id"])  # list
    tasks.find_one(lambda r: ...)       # dict or None
    tasks.get(record_id)                # dict or None
    tasks.insert({...})                 # returns the record with a new "_id"
    tasks.update(record_id, {...})      # merges; returns the record or None
    tasks.delete(record_id)             # returns True or False
  Records are JSON: convert Pydantic models with .model_dump(), and dates
  to ISO strings. Do not read or write JSON files directly.
- Never use JsonCollection("users"): user accounts belong to the fixed
  authentication code.
- User-owned records store "userId": current_user["_id"]. List queries
  filter by it. Read, update and delete return 404 when the record does
  not exist or belongs to another user.
- Errors: raise HTTPException(status_code=..., detail="message"). The
  client receives { "message": "..." }.
- Responses: return plain dicts/lists whose records use "_id" (never "id"):
  list -> { "<resource>": [...] }, one record -> { "<singular>": {...} },
  delete -> { "message": "..." }. Create routes use status_code=201.
- Read-only catalog data (e.g. products a user can only browse) ships seed
  records in backend/data/<resource>.json: a JSON array where every record
  has a string "_id". Collections users add to need no file.

FRONTEND (the code you write)

- frontend/src/App.jsx defines ONLY the routes. BrowserRouter and
  AuthProvider are already in main.jsx. It must use:
    <Routes> with "/login" -> Login and "/signup" -> Signup, and every
    private page inside <ProtectedRoute>...</ProtectedRoute>, with "/" as
    the main page after login.
    import ProtectedRoute from "./components/ProtectedRoute";
- API calls ONLY through the existing client, WITHOUT the /api prefix:
    import api, { getErrorMessage } from "../services/api";
    const { data } = await api.get("/tasks");
  Never use fetch, a full URL or a new axios instance.
- Auth state: import { useAuth } from "../context/AuthContext";
    const { user, logout } = useAuth();
  Pages must offer a visible logout button that calls logout().
- Frontend packages available: react, react-dom, react-router-dom, axios,
  lucide-react. No others. package.json is fixed.
- Components and pages use "export default". Import only names that the
  target file really exports.
- Style everything with Tailwind utility classes: a clean responsive
  layout, cards, clear buttons, focus states. Every page handles loading,
  empty and error states (show getErrorMessage(error)).

GENERAL

- Real, complete logic for every requested feature: no TODOs or
  placeholders, and every feature reachable from the UI.
- Every endpoint the frontend calls must exist with the same method and
  path, and the frontend must read the exact response shape.
`;

export const fixerRules = `
${PROJECT_RULES}

When fixing: authentication and the fixed files are correct and cannot be
changed, so fix the feature code that uses them. Any change returned for a
fixed file is discarded.
`;
