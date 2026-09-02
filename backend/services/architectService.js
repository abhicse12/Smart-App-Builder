import generateWithAI from "./aiService.js";

const createProjectArchitecture = async (prompt) => {
  const architecturePrompt = `
You are the Architect Agent of an AI application builder.

Analyze the following user requirement:

"${prompt}"

Your job is NOT to generate source code.

Your job is to create a COMPLETE project blueprint.

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

Rules:

1. Generate ALL files required for the application.
2. Include every frontend file required.
3. Include every backend file required.
4. Include package.json files.
5. Include .env.example where environment variables are needed.
6. Include configuration files.
7. Include database models if a database is required.
8. Include controllers and routes if backend APIs are required.
9. Include React components required by the application.
10. Include README.md.
11. Include .gitignore.
12. Every file that will be imported by another file MUST exist in this list.

For a MERN application, consider this structure:

package.json
README.md
.gitignore

backend/package.json
backend/server.js
backend/app.js
backend/.env.example
backend/config/db.js
backend/models/
backend/controllers/
backend/routes/
backend/middleware/

frontend/package.json
frontend/index.html
frontend/vite.config.js
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/index.css
frontend/src/components/

Generate only files actually needed, but ensure the application is complete and runnable.

Return ONLY JSON.
`;

  const result = await generateWithAI(architecturePrompt);

  return result;
};

export default createProjectArchitecture;