import generateWithAI from "./aiService.js";
import retrieveRelevantKnowledge from "./retrievalService.js";
import loadArchitectureRules from "./architectureRulesService.js";
import {
  buildConsoleArchitectPrompt,
  getConsoleLanguage,
} from "./consoleProject.js";
import {
  API_CONVENTIONS,
  usesApiConventions,
} from "./generationContract.js";

const createProjectArchitecture = async (
  prompt,
  techStack = []
) => {
  // Python-only / Java-only stacks: a basic console program, not a web app
  const consoleLanguage = getConsoleLanguage(techStack);

  if (consoleLanguage) {
    console.log(
      `Console project (${consoleLanguage}): using the basic program architect`
    );

    return generateWithAI(
      buildConsoleArchitectPrompt(prompt, consoleLanguage)
    );
  }

  // ==================================================
  // SELECTED TECHNOLOGY STACK
  // ==================================================

   const selectedTechStack =
    Array.isArray(techStack) && techStack.length > 0
      ? techStack.join(", ")
      : "Not specified";
   const architectureRules =
  await loadArchitectureRules(techStack);

  // Express + Vite projects get the shared API contract rules
  const apiContractRules = usesApiConventions(techStack)
    ? `${API_CONVENTIONS}

==================================================
API CONTRACT (REQUIRED IN YOUR OUTPUT)
==================================================

For every project with a backend, list EVERY backend endpoint the
application needs in "apiContract". The Coder Agent generates the
backend and frontend in separate batches and uses this list as the
single source of truth, so it must be complete and exact:

- method:      GET, POST, PUT, PATCH or DELETE
- path:        full path starting with /api (use :id for parameters)
- auth:        true if the endpoint requires the Bearer token
- body:        request body fields, e.g. { "email": "string" } (or null)
- response:    the JSON response shape, e.g. { "tasks": "Task[]" }
- description: what the endpoint does

Include the authentication endpoints from the conventions when the
app has login. Every frontend feature (list, create, edit, delete,
search, etc.) must have its endpoint here, and every endpoint must
be used by the frontend.

Also include frontend/src/services/api.js (the axios client) and,
when the app has login, backend/config/jwt.js (the single JWT secret)
and frontend/src/context/AuthContext.jsx in the "files" plan.
`
    : "";
  // ==================================================
  // RAG RETRIEVAL
  // ==================================================

  const retrievalQuery = `
Application Requirements:
${prompt}

Selected Technology Stack:
${selectedTechStack}
`;

  console.log("\n🔎 Retrieving relevant knowledge...");

  const relevantKnowledge =
  await retrieveRelevantKnowledge(
    retrievalQuery,
    techStack,
    3
  );

  console.log(
    "Retrieved Knowledge:",
    relevantKnowledge.map((item) => ({
      source: item.source,
      score: item.score,
    }))
  );

  // Convert retrieved chunks into context for Architect Agent
  const knowledgeContext =
    relevantKnowledge.length > 0
      ? relevantKnowledge
          .map(
            (item, index) => `
--- Knowledge ${index + 1} ---
Source: ${item.source}
Relevance Score: ${item.score}

${item.content}
`
          )
          .join("\n")
      : "No relevant knowledge was retrieved.";

  // ==================================================
  // ARCHITECT PROMPT
  // ==================================================

  const architecturePrompt = `

You are the Architect Agent of an AI application builder.

Analyze the following user requirement:

"${prompt}"

==================================================
SELECTED TECHNOLOGY STACK
==================================================

The user selected the following technologies when creating the project:

${selectedTechStack}

THIS SELECTED TECHNOLOGY STACK IS A HARD CONSTRAINT.

You MUST respect the selected technology stack.

Do NOT introduce technologies, frameworks, libraries, databases,
or backend services that were not selected by the user unless
they are absolutely required by the selected technology itself.

## Architecture Rules

The following architecture rules are mandatory.

${architectureRules}

==================================================
RETRIEVED KNOWLEDGE FROM RAG
==================================================

The following knowledge was retrieved from the project's
architecture knowledge base.

Use this knowledge as architectural guidance.

${knowledgeContext}

IMPORTANT RAG RULES:

1. Use retrieved knowledge when it is relevant to the application.

2. Retrieved knowledge is guidance, not a replacement for the
   user's explicit requirements.

3. The explicitly selected technology stack has higher priority
   than retrieved knowledge.

4. Do NOT introduce a technology simply because it appears in
   the retrieved knowledge.

5. Do NOT use React/Vite/Node.js/Express/MongoDB when the user
   selected only HTML, CSS and JavaScript.

6. Do NOT introduce a backend unless the application actually
   requires backend functionality or the selected stack requires it.

7. The final architecture must satisfy the user's requirements
   and remain compatible with the selected technology stack.



==================================================
IMPORTANT TECHNOLOGY PRIORITY
==================================================

Priority order:

1. Explicitly selected technology stack
2. Explicit technology requested in the user's requirements
3. Relevant retrieved RAG knowledge
4. Application functionality requirements
5. General architecture defaults

The selected technology stack MUST NOT be silently replaced
with another framework.

If the user's requirements conflict with the selected stack,
prefer the explicitly selected stack unless the user clearly
requests a different technology.

## Persistence / Demo-First Requirements (MANDATORY)

This section applies whenever the architecture includes a backend
that stores data: users, tasks, patients, bills, products, or ANY
other persistent entity requested by the application.

It applies to ALL persistence, not only authentication.

Generated applications are executed in a sandbox where NO database
is available and NO .env file is provided. The JSON fallback below
is MANDATORY. It overrides any softer wording (such as
"when possible") in the Architecture Rules or retrieved knowledge.

Selecting MongoDB means Mongoose is used when MONGO_URI is set;
when it is not set, the backend must start and use JSON files in
backend/data/.

MongoDB remains part of the selected technology stack and MUST be
fully supported. The JSON persistence is a runtime fallback, not a
replacement. Planning it does NOT violate the selected technology
stack constraint.

If another database is selected (e.g. MySQL or PostgreSQL), the
same rule applies using that database's connection environment
variable.

The architecture MUST guarantee:

1. MongoDB/Mongoose is used when MONGO_URI is set.

2. When MONGO_URI is not set, the backend uses local JSON
   persistence under backend/data/*.json.

3. app.listen() does NOT depend on a successful MongoDB
   connection. The server starts in both modes.

4. The backend NEVER calls process.exit() because MONGO_URI is
   missing or MongoDB is unavailable.

5. The JSON fallback supports every CRUD/data operation the
   application requires (create, read, update, delete, find by id,
   find by field such as email), with the same API responses as
   MongoDB mode.

6. No backend .env file sets MONGO_URI to a Docker Compose service
   hostname (e.g. mongodb://mongodb:27017). MONGO_URI is documented
   in .env.example only.

### Required persistence files in the "files" plan

The file plan MUST explicitly contain the files required for the
fallback. Do NOT leave the Coder to invent them.

For every data-bearing application, include (following the
project's backend folder structure):

- One JSON data file per persistent entity, for example:
  - backend/data/users.json
  - backend/data/tasks.json
  - a backend/data/<entity>.json file for every other requested
    entity

- A JSON storage module that reads and writes these files and
  creates missing directories/files at runtime, for example:
  backend/storage/jsonStore.js

- A data-access layer for each entity (repository or service) that
  selects MongoDB mode or JSON mode and is used by the controllers,
  for example: backend/repositories/taskRepository.js

- The database connection module (e.g. backend/config/db.js) that
  connects only when MONGO_URI is set and never exits the process.

- The Mongoose models, when MongoDB is selected.

The "purpose" of each of these files MUST state its role in the
dual-mode persistence. Examples:

- backend/data/tasks.json:
  "JSON persistence for tasks when MONGO_URI is not set; initial
  content []"

- backend/repositories/taskRepository.js:
  "Task data access; uses the Mongoose Task model when MONGO_URI is
  set, otherwise backend/data/tasks.json through the JSON store"

- backend/server.js:
  "Calls app.listen() regardless of database state; connects to
  MongoDB only when MONGO_URI is set; never exits because MongoDB
  is unavailable"

Before producing the final architecture, verify that EVERY
persistent entity has a JSON data file and a data-access path in
the file plan.

## Feature Completeness Requirements

Every functional requirement explicitly requested by the user MUST be
represented completely in the architecture.

For each requested feature, identify the complete implementation path
across all required layers.

For CRUD functionality, ALL four operations must be supported when
requested:

- Create
- Read
- Update
- Delete

For each CRUD operation, the architecture must provide:

1. Frontend UI/action
2. Frontend API/service function
3. Backend API route
4. Backend controller/handler
5. Persistence implementation
6. Demo-mode implementation when demo mode is required
7. Success and error handling
8. Frontend state update after successful operation

For filtering, searching, sorting, pagination, authentication,
authorization, file upload, or any other explicitly requested feature,
the same principle applies: the feature must have a complete
implementation path from the user interface to the required backend
logic and persistence.

A feature is NOT considered complete if only one layer is implemented.

Examples:

- A Delete button without a DELETE API is incomplete.
- A DELETE API without a frontend action is incomplete.
- A backend route without its controller implementation is incomplete.
- A frontend API function that is never connected to the UI is incomplete.

Before producing the final architecture, verify that EVERY explicit
user requirement has a corresponding end-to-end implementation path.

Do not omit functionality merely because another feature is similar.

## Authentication Requirements

If the user requests login, signup, authentication, or user accounts,
the generated application MUST include a complete working authentication
flow.

The authentication system must work WITHOUT requiring an external
database in demo mode.

### Required Authentication Features

1. Signup UI
   - Name
   - Email
   - Password
   - Confirm password
   - Validation
   - Link to Login

2. Login UI
   - Email
   - Password
   - Validation
   - Link to Signup
   - Loading state
   - Error handling

3. Backend Authentication
   - POST signup endpoint
   - POST login endpoint
   - Authentication validation
   - Proper success/error responses

4. Demo-mode Storage
   - Store users in a local JSON file.
   - Example:
     backend/data/users.json
   - Signup must add the new user to this JSON file.
   - Login must read users from this JSON file and validate
     email and password against the stored user.

5. Password Security
   - Never store plaintext passwords when a hashing library is
     available in the selected backend technology.
   - Hash passwords before storing them.
   - Compare the supplied password with the stored hash during login.

6. Authentication State
   - After successful login, the frontend must know that the user
     is authenticated.
   - Protected pages/features must require authentication when
     authentication is part of the user's requirements.
   - Logout must clear the authentication state.

7. Frontend Integration
   - Login form must call the login API.
   - Signup form must call the signup API.
   - Authentication errors must be displayed to the user.
   - Successful login must redirect to the appropriate application
     page.

8. Demo Mode
   - The generated application must run without MongoDB,
     PostgreSQL, MySQL, or any external authentication service.
   - External database/authentication services may be documented
     separately, but they must NOT be required for the generated
     demo to work.

A feature is incomplete if the UI exists without the API, the API
exists without the UI, or the authentication state is not connected
to the application.

Authentication must be treated as an end-to-end feature.

Required flow:

Signup UI
→ Signup API
→ Auth Controller
→ JSON User Storage
→ Login UI
→ Login API
→ Credential Validation
→ Authentication State
→ Protected Application
→ Logout

${apiContractRules}

==================================================
YOUR ROLE
==================================================

Your job is NOT to generate source code.

Your job is to create a COMPLETE, CONSISTENT, DEPLOYABLE and
RUNNABLE project blueprint.

The blueprint will be passed to a separate Coder Agent which
will generate the actual source code.

Return ONLY valid JSON.

Use exactly this structure:

{
  "projectName": "string",
  "description": "string",
  "techStack": ["string"],
  "files": [
    {
      "path": "string",
      "purpose": "string"
    }
  ],
  "apiContract": [
    {
      "method": "POST",
      "path": "/api/auth/login",
      "auth": false,
      "body": { "email": "string", "password": "string" },
      "response": { "token": "string", "user": "User" },
      "description": "string"
    }
  ]
}

"apiContract" is [] for projects without a backend.


Return ONLY valid JSON.

Do NOT include markdown.

Do NOT include explanations outside JSON.

`;

  // ==================================================
  // GENERATE ARCHITECTURE
  // ==================================================

  const result = await generateWithAI(
    architecturePrompt
  );

  return result;
};

export default createProjectArchitecture;