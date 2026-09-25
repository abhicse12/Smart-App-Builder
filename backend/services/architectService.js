import generateWithAI from "./aiService.js";
import retrieveRelevantKnowledge from "./retrievalService.js";

const createProjectArchitecture = async (
  prompt,
  techStack = []
) => {
  // ==================================================
  // SELECTED TECHNOLOGY STACK
  // ==================================================

  const selectedTechStack =
    Array.isArray(techStack) && techStack.length > 0
      ? techStack.join(", ")
      : "Not specified";

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

For example:

If the selected stack is:

HTML, CSS, JavaScript

then generate a STATIC VANILLA WEB APPLICATION.

Use:

- HTML
- CSS
- Vanilla JavaScript

Do NOT generate:

- React
- React DOM
- Vite
- Next.js
- Node.js
- Express
- MongoDB
- Backend
- API server
- JSX
- TSX

unless the user explicitly selected or requested them.

For a static HTML/CSS/JavaScript project, the preferred structure is:

project-root/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore

Do NOT create package.json for a simple static HTML/CSS/JavaScript
application unless the user explicitly requests a Node.js-based setup
or a build system.

If the selected stack contains React:

Use React according to the React architecture rules below.

If the selected stack contains Node.js/Express:

A backend may be created according to the backend rules below.

If the selected stack contains MongoDB:

Only introduce MongoDB when the application actually requires
persistent database storage.

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
  ]
}

==================================================
GENERAL ARCHITECTURE RULES
==================================================

1. Generate ALL files required for a complete runnable application.

2. Every file imported by another file MUST exist in the blueprint.

3. Every dependency used by generated source code MUST be represented
   in the appropriate package.json.

4. Every API used by the frontend MUST have a corresponding backend route.

5. Every backend route MUST have a corresponding controller function.

6. Every controller MUST have all required model/service dependencies.

7. Every model referenced by a controller MUST exist.

8. Every frontend page/component referenced by another frontend file
   MUST exist.

9. Do NOT generate duplicate files.

10. Do NOT generate duplicate project structures.

11. Do NOT create unnecessary files.

12. Do NOT generate source code.

13. Only generate file paths and detailed purposes.

14. Generate README.md and .gitignore.

15. Generate .env.example only when environment variables are required.

16. Include package.json files only when the selected architecture
    requires a package manager/build system.

==================================================
STATIC HTML/CSS/JAVASCRIPT RULES
==================================================

If the selected technology stack is HTML + CSS + JavaScript
without React, Vue, Angular, Next.js or another frontend framework:

1. Generate a static frontend application.

2. Use plain HTML.

3. Use plain CSS.

4. Use vanilla JavaScript.

5. The main HTML entry point MUST be:

   index.html

6. CSS should normally be:

   style.css

7. JavaScript should normally be:

   script.js

8. Do NOT generate:

   frontend/
   backend/
   src/
   App.jsx
   main.jsx
   vite.config.js
   package.json

   unless explicitly required by the user's selected stack
   or application requirements.

9. Do NOT use React.

10. Do NOT use JSX.

11. Do NOT use Vite.

12. Do NOT use Node.js.

13. Do NOT use Express.

14. Do NOT use MongoDB.

15. Do NOT create API routes.

16. Do NOT create backend controllers.

17. Do NOT create backend models.

18. The application MUST be directly runnable by a static web server.

19. Keep the architecture as simple as possible.

For example, a basic Tic-Tac-Toe game should normally contain:

index.html
style.css
script.js
README.md
.gitignore

==================================================
MERN / REACT ARCHITECTURE RULES
==================================================

Only apply the following rules when React and the required
backend technologies are actually selected or explicitly requested.

If the user requests a MERN / React + Node.js application:

Use:

project-root/

├── package.json
├── README.md
├── .gitignore

├── backend/
│   ├── package.json
│   ├── server.js
│   ├── app.js
│   ├── .env.example
│   ├── config/
│   │   └── db.js
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   └── middleware/

└── frontend/
    ├── package.json
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        ├── components/
        ├── pages/
        ├── services/
        └── hooks/

==================================================
STRICT MERN PROJECT STRUCTURE
==================================================

For MERN applications:

1. Use ONLY "backend" for backend code.

2. Use ONLY "frontend" for frontend code.

3. NEVER create:

   client/
   server/

4. NEVER create another top-level backend or frontend directory.

5. Backend entry point MUST be:

   backend/server.js

6. Backend Express application MUST be:

   backend/app.js

7. Frontend entry point MUST be:

   frontend/src/main.jsx

8. Main React component MUST be:

   frontend/src/App.jsx

9. Vite configuration MUST be:

   frontend/vite.config.js

10. Frontend global stylesheet MUST be:

    frontend/src/index.css

11. Frontend API client SHOULD be:

    frontend/src/services/api.js

    when API communication is required.

12. React + Vite MUST be used for React applications.

13. Do NOT use react-scripts.

==================================================
FRONTEND TECHNOLOGY RULES
==================================================

For React + Vite applications:

1. Use React.

2. Use Vite.

3. Use Tailwind CSS v4 for styling unless the user explicitly
   requests another styling system.

4. frontend/package.json MUST include:

   - react
   - react-dom
   - vite
   - @vitejs/plugin-react
   - tailwindcss
   - @tailwindcss/vite

5. Include react-router-dom when multiple pages/routes are required.

6. Include other dependencies only when actually required.

7. Do NOT use dependencies that are not required.

==================================================
FRONTEND ROUTING RULES
==================================================

If the application has multiple React pages:

1. Include react-router-dom.

2. frontend/src/App.jsx MUST be responsible for route configuration
   or import a dedicated routing configuration.

3. Every route path MUST correspond to an existing page component.

4. If Link or useNavigate is used, the application MUST contain
   Router configuration.

5. BrowserRouter must wrap the application when React Router is used.

==================================================
BACKEND RULES
==================================================

Only generate a backend when the selected technology stack
or explicit user requirements require a backend.

If the application requires a backend:

Include:

backend/package.json
backend/server.js
backend/app.js

If MongoDB is required:

backend/config/db.js

If authentication is required:

Include all required authentication files and dependencies.

==================================================
DATABASE RULES
==================================================

If MongoDB is required:

1. Include mongoose in backend/package.json.

2. Include:

   backend/config/db.js

3. Include required models inside:

   backend/models/

4. Every model must correspond to an actual application entity.

5. Model field names must be treated as canonical field names
   throughout the entire application.

==================================================
ENTITY COMPLETENESS RULE
==================================================

For every major management entity requested by the user:

Entity

→ Model

→ Controller

→ Routes

→ Frontend API usage

→ Frontend page

If CRUD management is required, include:

GET all
GET by ID
POST
PUT/PATCH
DELETE

unless the user explicitly requires fewer operations.

==================================================
FIELD CONSISTENCY RULE
==================================================

The architecture MUST define canonical field names for every
major entity.

The same field name MUST be used consistently throughout:

- Model
- Controller
- Routes
- Business logic
- Frontend forms
- Frontend tables
- API requests

==================================================
API CONSISTENCY RULE
==================================================

Every frontend API endpoint MUST map to an existing backend route.

Do NOT invent frontend endpoints that are not represented
in the backend architecture.

==================================================
API CLIENT RULE
==================================================

When a React frontend communicates with a backend:

Include:

frontend/src/services/api.js

Use:

baseURL: "/api"

Do NOT hardcode:

http://localhost:5000

or:

http://localhost:5001

inside React components.

The generated Vite configuration should support:

"/api"

proxying to:

"http://localhost:5001"

==================================================
DOCKER RUNTIME REQUIREMENTS
==================================================

For applications that use Node.js/Vite:

1. Backend MUST use process.env.PORT.

2. Backend MUST default to port 5001.

3. Backend MUST listen on:

   0.0.0.0

4. Frontend Vite server MUST listen on:

   0.0.0.0

5. Frontend Vite server MUST use port 5173.

6. Frontend API requests MUST use:

   /api

7. Vite proxy MUST target:

   http://localhost:5001

8. Environment variables required by backend MUST be documented in:

   backend/.env.example

For static HTML/CSS/JavaScript projects:

1. Do NOT require a Node.js backend.

2. Do NOT require a Vite server.

3. The project must work through a static HTTP server.

==================================================
PACKAGE.JSON REQUIREMENTS
==================================================

Only create package.json when the selected architecture requires it.

For Node.js applications:

Include every dependency actually required by the source code.

For React applications:

Include the required React/Vite dependencies.

Do NOT create package.json for a simple static
HTML/CSS/JavaScript project.

==================================================
IMPORT CONSISTENCY RULE
==================================================

Before returning the blueprint, internally verify:

1. Every imported local file exists.

2. Every route has a controller.

3. Every controller has required models/services.

4. Every frontend page import exists.

5. Every frontend component import exists.

6. Every API endpoint has a corresponding backend route.

7. Every dependency used by source code is represented in package.json.

8. Every package.json dependency is compatible with the selected architecture.

9. Every React Router usage has Router configuration.

10. Every JWT usage has jsonwebtoken.

11. Every bcrypt usage has the corresponding bcrypt dependency.

==================================================
FILE PURPOSE RULE
==================================================

Every file purpose MUST clearly describe:

1. What the file is responsible for.

2. Which other files it interacts with.

3. Which API/model/route it belongs to when applicable.

4. Required dependencies.

The purpose must contain enough information for the Coder Agent
to generate the correct implementation.

==================================================
FINAL ARCHITECTURE VALIDATION
==================================================

Before returning the JSON, perform an internal architecture audit.

Check:

- Duplicate paths
- Missing files
- Missing dependencies
- Missing routes
- Missing controllers
- Missing models
- Missing frontend pages
- Missing API client
- Missing Router configuration
- Missing authentication dependencies
- Field name inconsistencies
- API endpoint inconsistencies
- Tailwind configuration when React is used
- Vite configuration when React/Vite is used
- Docker compatibility
- Environment variables
- MERN structure when MERN is selected
- Backend/frontend separation when backend is required
- Static project simplicity when HTML/CSS/JavaScript is selected
- Selected technology stack compliance

CRITICAL:

The returned "techStack" field MUST reflect the user's selected
technology stack.

Do NOT change:

HTML, CSS, JavaScript

into:

React, Node.js, Express

unless the user explicitly requested those technologies.

The final blueprint MUST describe a project that can be generated
by the Coder Agent and subsequently installed, built and executed
without missing architectural components.

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