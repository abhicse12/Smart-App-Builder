import generateWithAI from "./aiService.js";

const createProjectArchitecture = async (prompt) => {
  const architecturePrompt = `
You are the Architect Agent of an AI application builder.

Analyze the following user requirement:

"${prompt}"

Your job is NOT to generate source code.

Your job is to create a COMPLETE, CONSISTENT, and RUNNABLE project blueprint.

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
GENERAL RULES
==================================================

1. Generate ALL files required for a complete runnable application.

2. Every file imported by another file MUST exist in the blueprint.

3. Do NOT generate duplicate files or duplicate project structures.

4. Do NOT create unnecessary folders.

5. The project structure must be internally consistent.

6. Do NOT generate source code. Only generate file paths and purposes.

7. Generate README.md and .gitignore.

8. Generate .env.example when environment variables are required.

9. Include package.json files with correct purposes.

10. Include all configuration files required to run the application.

==================================================
MANDATORY MERN PROJECT STRUCTURE
==================================================

If the user requests a MERN / React + Node.js application, ALWAYS use this structure:

project-root/
│
├── package.json
├── README.md
├── .gitignore
│
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
│
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
STRICT STRUCTURE RULES
==================================================

For MERN applications:

1. Use ONLY "backend" for backend code.

2. Use ONLY "frontend" for frontend code.

3. NEVER create these folders:

   client/
   server/

4. NEVER create another top-level backend or frontend folder.

5. NEVER create duplicate server.js files unless explicitly required.

6. Backend entry point MUST be:

   backend/server.js

7. Backend Express application MUST be:

   backend/app.js

8. Frontend MUST use React + Vite.

9. Frontend entry point MUST be:

   frontend/src/main.jsx

10. Main React component MUST be:

   frontend/src/App.jsx

11. Vite configuration MUST be:

   frontend/vite.config.js

12. Frontend package.json MUST contain the required Vite/React dependencies and scripts.

13. Backend package.json MUST contain the required Node.js dependencies.

14. Root package.json MUST NOT contain application source code.

15. Do not create both CRA and Vite configurations.

16. Do not use react-scripts for a Vite application.

==================================================
PACKAGE.JSON REQUIREMENTS
==================================================

For the root package.json:

It should contain useful project-level scripts when required.

For example, a MERN project may use:

- install
- dev
- build

If concurrently is required for running frontend and backend together,
include it in the root dependencies/devDependencies.

For backend/package.json:

Include:

- start script
- dev script when appropriate
- all backend dependencies actually used

For frontend/package.json:

Include:

- dev script
- build script
- preview script
- React dependencies
- Vite dependency

Do NOT use react-scripts.

==================================================
BACKEND RULES
==================================================

If the application requires a backend:

Include:

backend/package.json
backend/server.js
backend/app.js

If MongoDB is required, include:

backend/config/db.js

If authentication is required, include appropriate:

models/
controllers/
routes/
middleware/

Only include files that are actually needed.

==================================================
FRONTEND RULES
==================================================

For React applications:

Use React + Vite.

Include:

frontend/package.json
frontend/index.html
frontend/vite.config.js
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/index.css

Add components/pages/services/hooks only when required.

==================================================
DATABASE RULES
==================================================

If MongoDB is required:

Include MongoDB/Mongoose dependencies in backend/package.json.

Include:

backend/config/db.js

Include required models inside:

backend/models/

Do NOT create database files if the application does not require a database.

==================================================
API CONSISTENCY RULE
==================================================

Every frontend API service must correspond to an actual backend route.

For example:

frontend/src/services/api.js

must only call routes that exist under:

backend/routes/

Every backend route must have its required controller.

Every controller import must point to an existing file.

==================================================
IMPORT CONSISTENCY RULE
==================================================

Before returning the blueprint, internally verify:

- Every imported file exists.
- Every route has its controller.
- Every controller has required model/service files.
- Every frontend page/component import exists.
- Every dependency used by the project is represented in package.json.
- No duplicate frontend structure exists.
- No duplicate backend structure exists.

==================================================
RUNTIME REQUIREMENTS
==================================================

The generated project must be designed so that:

1. Backend can be started independently.

2. Frontend can be started independently.

3. Frontend can communicate with backend APIs.

4. Required environment variables are documented in .env.example.

5. The project can be installed using npm.

6. The project can be built successfully.

7. The project can be executed inside a Docker-based isolated environment later.

==================================================
FINAL VALIDATION
==================================================

Before returning the JSON:

- Check for duplicate paths.
- Check for missing required files.
- Check for conflicting technologies.
- Check that package.json files match the selected technology.
- Check that frontend structure matches React + Vite.
- Check that backend structure matches Node.js + Express.
- Check that no "client" or "server" duplicate structure exists for MERN projects.

Return ONLY valid JSON.

Do NOT include markdown.
Do NOT include explanations outside JSON.
`;

  const result = await generateWithAI(architecturePrompt);

  return result;
};

export default createProjectArchitecture;