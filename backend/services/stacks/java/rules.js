// Shared rules for the Architect, Coder, Fixer and Modify prompts of
// Java full-stack projects. These override retrieved RAG knowledge.

import { LOCKED_PATHS } from "./templates.js";

export const PROJECT_RULES = `
==================================================
JAVA FULL-STACK RULES (MANDATORY - OVERRIDE ANY OTHER KNOWLEDGE)
==================================================

Stack: Java 21 + Spring Boot 3 backend, React 19 + Vite + Tailwind CSS 4
frontend. Data is stored in JSON files, because the app has no database
server. Do not use JPA, Hibernate, JDBC, MongoDB, SQL, Lombok, Node.js or
Express, even if the user selected a database.

FIXED FILES ALREADY EXIST. Never create or change them:
${LOCKED_PATHS.map((filePath) => `- ${filePath}`).join("\n")}

Starter files that also exist (change them only if the user asks):
- frontend/src/pages/Login.jsx, frontend/src/pages/Signup.jsx
- frontend/src/index.css

Signup, login, logout, password hashing, JWT and Spring Security are ALREADY
COMPLETE. Never write authentication or security code. POST /api/auth/signup,
POST /api/auth/login and GET /api/auth/me already exist.

BACKEND (the code you write)

- Only these packages, and the package must match the folder:
    com.app.controllers -> backend/src/main/java/com/app/controllers/
    com.app.services    -> backend/src/main/java/com/app/services/
    com.app.dto         -> backend/src/main/java/com/app/dto/
  One public type per file, named exactly like the file. Class names are
  unique across the project. No tests.
- Controllers are found automatically:
    @RestController
    @RequestMapping("/api/tasks")
    public class TaskController { ... }
  Use @GetMapping, @PostMapping, @PutMapping, @PatchMapping and
  @DeleteMapping with @PathVariable String id. Route strings never end in "/".
- Request bodies are Java records in com.app.dto, for example:
    public record TaskRequest(@NotBlank String title, String notes) {}
  taken with @Valid @RequestBody TaskRequest body. Records have accessors
  like body.title(), never getTitle(). Constraints come from
  jakarta.validation.constraints.
- Optional logic goes in a @Service class in com.app.services, injected
  through the controller's constructor.
- Allowed imports: java.*, jakarta.validation.*, org.springframework.web.*,
  org.springframework.http.*, org.springframework.stereotype.*,
  org.springframework.beans.*, org.springframework.format.*,
  org.springframework.security.core.annotation.*, com.fasterxml.jackson.*,
  org.slf4j.* and com.app.* only. pom.xml is fixed, so no other packages exist.
- Every route needs a login, except GET /api/public/**. Get the user with:
    import com.app.security.AuthUser;
    import org.springframework.security.core.annotation.AuthenticationPrincipal;
    public Map<String, Object> list(@AuthenticationPrincipal AuthUser user) { ... }
  AuthUser is a record: user.id(), user.name(), user.email().
- Store data ONLY through this class:
    import com.app.storage.JsonCollection;
    private final JsonCollection tasks = new JsonCollection("tasks"); // backend/data/tasks.json
    tasks.all()                       // List<Map<String, Object>>
    tasks.find(r -> user.id().equals(r.get("userId")))  // List<Map<String, Object>>
    tasks.findOne(r -> ...)           // Optional<Map<String, Object>>
    tasks.get(id)                     // Optional<Map<String, Object>>
    tasks.insert(record)              // Map<String, Object> with a new "_id"
    tasks.update(id, changes)         // merges; Optional<Map<String, Object>>
    tasks.delete(id)                  // boolean
  Do not read or write JSON files directly.
- Records are Map<String, Object>, so cast what you read:
    (String) r.get("title")
    ((Number) r.get("price")).doubleValue()
    Boolean.TRUE.equals(r.get("done"))
  Numbers read back from a file can be Integer or Double, so always go through
  Number. Store dates as ISO strings, e.g. LocalDate.now().toString().
- Map.of(...) throws on null values and cannot be changed. For a record that
  may hold nulls use a new HashMap<>() and put(...).
- Never use new JsonCollection("users"): accounts belong to the fixed
  authentication code.
- User-owned records store "userId": user.id(). List queries filter by it.
  Read, update and delete return 404 when the record does not exist or belongs
  to another user.
- Errors:
    import com.app.errors.ApiException;
    import org.springframework.http.HttpStatus;
    throw new ApiException(HttpStatus.NOT_FOUND, "Task not found");
  The client receives { "message": "..." }.
- Responses: return Map<String, Object> whose records use "_id" (never "id"):
  list -> { "<resource>": [...] }, one record -> { "<singular>": {...} },
  delete -> { "message": "..." }. Create routes add
  @ResponseStatus(HttpStatus.CREATED).
- Never wrap a record in Optional.map(...), because Java infers the wrong type
  and the code does not compile. Take the record out first:
    @GetMapping("/{id}")
    public Map<String, Object> get(
        @AuthenticationPrincipal AuthUser user,
        @PathVariable String id
    ) {
      Map<String, Object> task = tasks.get(id)
          .filter(r -> user.id().equals(r.get("userId")))
          .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Task not found"));
      return Map.of("task", task);
    }
- Read-only catalog data (e.g. products anyone can browse) ships seed records
  in backend/data/<resource>.json: a JSON array where every record has a string
  "_id". Serve it from a controller mapped to /api/public/<resource>, GET only.
  Collections users add to need no file.

FRONTEND (the code you write)

- frontend/src/App.jsx defines ONLY the routes. BrowserRouter and
  AuthProvider are already in main.jsx. It must use:
    <Routes> with "/login" -> Login and "/signup" -> Signup, and every
    private page inside <ProtectedRoute>...</ProtectedRoute>, with "/" as
    the main page after login.
    import ProtectedRoute from "./components/ProtectedRoute";
- API calls ONLY through the existing client, WITHOUT the /api prefix and
  without a trailing slash:
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
- The code must compile: import every class you use and match every method
  signature exactly.
`;

export const fixerRules = `
${PROJECT_RULES}

When fixing: authentication and the fixed files are correct and cannot be
changed, so fix the feature code that uses them. Any change returned for a
fixed file is discarded. Maven errors name the file and line to fix.

If Maven reports "incompatible types" with Map<String, Map<String, Object>>,
a cast will not fix it. Remove .map(...), store the result of .orElseThrow(...)
in a Map<String, Object> variable, then return Map.of("key", variable).
`;
