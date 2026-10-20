import generateWithAI from "./aiService.js";
import retrieveRelevantKnowledge from "./retrievalService.js";
import {
  API_CONVENTIONS,
  formatApiContract,
  usesApiConventions,
} from "./generationContract.js";

const generateBatchCode = async ({
  projectName,
  description,
  techStack,
  files,
  allFiles,
  apiContract = [],
  implementedEndpoints = [],
  generatedModules = [],
}) => {
  // Shared API contract for Express + Vite projects. Backend files are
  // generated first, so frontend batches see the routes that really exist.
  const contractSection = usesApiConventions(techStack)
    ? `
${API_CONVENTIONS}

==================================================
API CONTRACT (FROM THE ARCHITECT)
==================================================

${formatApiContract(apiContract)}

==================================================
BACKEND ENDPOINTS ALREADY GENERATED (AUTHORITATIVE)
==================================================

These routes exist in backend files generated in earlier batches.
Frontend code MUST call exactly these methods and paths (through the
api client, without the /api prefix). If they differ from the API
contract above, these win. Backend files in this batch must not change
them.

${
  implementedEndpoints.length > 0
    ? implementedEndpoints
        .map((endpoint) => `${endpoint.method} ${endpoint.path}`)
        .join("\n")
    : "None generated yet."
}
`
    : "";

  // Exports of files from earlier batches, so imports use real names
  const modulesSection =
    generatedModules.length > 0
      ? `
==================================================
MODULES ALREADY GENERATED (AUTHORITATIVE EXPORTS)
==================================================

Files from earlier batches and the names they export. When a requested
file imports from one of them, import ONLY these names ("default" means
use a default import). Do not assume any other export exists.

${generatedModules.join("\n")}
`
      : "";

    const retrievalQuery = `
  Project Name:
  ${projectName}

  Project Description:
  ${description}

  Technology Stack:
  ${techStack.join(", ")}

  Requested Files:
  ${files.map((file) => `${file.path} - ${file.purpose}`).join("\n")}
  `;

    console.log("\n🔎 Coder Agent retrieving relevant knowledge...");

    const relevantKnowledge = await retrieveRelevantKnowledge(
      retrievalQuery,
      techStack,
      3
    );

    console.log(
      "Coder Retrieved Knowledge:",
      relevantKnowledge.map((item) => ({
        source: item.source,
        score: item.score,
      }))
    );

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
  const batchPrompt = `
You are the Coder Agent of an AI application builder.

Project Name:

${projectName}

Project Description:

${description}

Technology Stack:

${techStack.join(", ")}

==================================================
RETRIEVED KNOWLEDGE FROM RAG
==================================================

Use the following retrieved knowledge as implementation guidance.

${knowledgeContext}

RAG RULES:

1. Use retrieved knowledge when it is relevant.
2. The selected technology stack has higher priority than RAG.
3. Do NOT introduce technologies that are not selected.
4. Follow the Architect Agent's file structure exactly.
5. Retrieved knowledge is guidance, not a replacement for the architecture blueprint.

Generate complete source code ONLY for the requested files.

==================================================
REQUESTED FILES
==================================================

${files
  .map(
    (file) => `
Path: ${file.path}

Purpose: ${file.purpose}
`
  )
  .join("\n")}

==================================================
COMPLETE PROJECT STRUCTURE
==================================================

${allFiles.map((file) => `- ${file.path}`).join("\n")}

${contractSection}
${modulesSection}

==================================================
BATCH OUTPUT RULES
==================================================

The requested files are the ONLY files you are allowed to generate.

ABSOLUTE RULES:

1. Return ONLY files whose paths appear in the REQUESTED FILES section.
2. NEVER return a file from the COMPLETE PROJECT STRUCTURE unless it is also listed in REQUESTED FILES.
3. If a file exists in the complete project structure but is NOT in REQUESTED FILES, DO NOT generate it.
4. Do NOT generate extra files.
5. Do NOT generate .gitignore, README.md, package.json, configuration files, or any other file unless that exact file is listed in REQUESTED FILES.
6. The number of objects in the "files" array MUST be exactly equal to the number of REQUESTED FILES.
7. The paths in the "files" array MUST exactly match the requested paths.
8. Before returning JSON, compare your generated file paths against REQUESTED FILES and remove every extra file.

==================================================
ROUTE / CONTROLLER CONSISTENCY
==================================================

Before returning the response, internally verify:

For every route:

route → controller function

For every controller:

controller → model/service

All names must match exactly.

For example:

If route contains:

router.post("/assignments", createAssignment);

then the controller MUST contain:

exports.createAssignment = ...

or the equivalent export format.

If a function does not exist, do NOT import it.

==================================================
PERSISTENCE / DEMO-FIRST (MANDATORY)
==================================================

Generated backends run in a sandbox where NO database is available
and NO .env file is provided. The backend MUST work in that sandbox.

You MUST IMPLEMENT the following behavior for every backend that
stores data (users, tasks, patients, bills, products, etc.).
Describing it in comments is NOT sufficient.

1. Two persistence modes, selected at startup:

   - If process.env.MONGO_URI is set:
     MongoDB/Mongoose may be used normally.

   - If process.env.MONGO_URI is NOT set:
     Use local JSON file persistence under backend/data/*.json
     (one file per entity, e.g. backend/data/users.json,
     backend/data/tasks.json).

2. The server MUST start without MongoDB:

   - app.listen() MUST NOT depend on a successful
     mongoose.connect(). Start listening regardless of the
     database state.
   - NEVER call process.exit() because MONGO_URI is missing or
     MongoDB is unreachable. Log a message and continue in
     JSON mode instead.
   - Only call mongoose.connect() when MONGO_URI is set.

3. Same behavior in both modes:

   - Controllers and routes MUST return the same responses,
     status codes and data shapes in both modes.
   - Implement the mode switch in the data-access layer
     (model/service/repository functions) inside the requested
     files, so controllers do not need to know which mode is
     active.
   - JSON mode MUST support every operation the app needs
     (create, read, update, delete, find by id, find by field
     such as email), generate unique ids, and persist changes by
     writing the JSON file.

4. JSON data files:

   - If backend/data/*.json files are in REQUESTED FILES,
     generate them with valid JSON (e.g. [] or seed records).
   - The JSON storage code MUST create the backend/data directory
     and any missing JSON file at runtime (with []) before reading,
     so the app works even if those files were not generated.
   - Do NOT create extra files that are not in REQUESTED FILES.

5. Environment files:

   - NEVER write a backend .env file containing a MONGO_URI such as
     mongodb://mongodb:27017, or any Docker Compose service hostname
     (e.g. "mongodb", "mongo", "db").
   - .env.example MAY document MONGO_URI for users who want a real
     MongoDB, but the application MUST work without it.

6. Do NOT generate a MongoDB-only backend. If MongoDB is in the
   technology stack, implement BOTH Mongoose (when MONGO_URI is set)
   AND the JSON fallback (when it is not).

==================================================
FRONTEND / BACKEND CONSISTENCY
==================================================

Every frontend API request must correspond to an existing backend route.

Use the exact API paths from the API contract / generated backend
endpoints. Do not invent API endpoints.

Frontend API requests must use the centralized API client
(frontend/src/services/api.js), created with:

axios.create({ baseURL: "/api" })

and called WITHOUT the /api prefix:

api.get("/patients")        -> GET /api/patients

api.post("/patients", data) -> POST /api/patients

Do NOT hardcode backend URLs, and do NOT call fetch("http://localhost:5001/...")
or paths outside /api: the Vite dev server only proxies /api to the backend.

==================================================
FRONTEND UI / STYLING RULES
==================================================

If the requested files belong to frontend/:

1. Use React + Vite.

2. Use Tailwind CSS v4 for frontend styling.

3. React JSX/TSX components MUST use Tailwind utility classes for visual styling.

4. Do NOT generate plain browser-default HTML for frontend pages.

5. Do NOT use arbitrary custom class names such as:

- dashboard
- card
- stats-grid
- login-page
- billing-page
- navbar
- sidebar

unless the corresponding CSS definitions are also generated.

6. Prefer Tailwind utility classes such as:

- flex
- grid
- gap-*
- p-*
- m-*
- rounded-*
- border
- bg-*
- text-*
- shadow-*
- hover:*
- md:*
- lg:*

7. Every visible page must have proper:

- spacing
- typography
- colors
- borders
- cards/containers
- buttons
- forms
- navigation
- responsive layout

8. Use a consistent modern production-style UI.

9. Make the application responsive for:

- mobile
- tablet
- desktop

10. Do not create CSS class names that have no corresponding CSS definition.

11. Avoid browser-default buttons, inputs and tables.

12. Forms should have proper labels, spacing, borders, focus states and validation feedback.

13. Tables should have proper responsive containers, borders, headers and spacing.

14. Dashboard statistics should use properly styled cards.

15. Navigation should have proper spacing, hover states and active states.

==================================================
TAILWIND CONFIGURATION RULES
==================================================

If generating:

frontend/index.css

it MUST contain:

@import "tailwindcss";

If tw-animate-css is used, include:

@import "tw-animate-css";

If @fontsource-variable/geist is used, include:

@import "@fontsource-variable/geist";

Do NOT use:

@import "shadcn/tailwind.css";

unless the shadcn package/setup actually exists in frontend/package.json.

If generating:

frontend/package.json

it MUST contain:

- tailwindcss
- @tailwindcss/vite

If the project uses:

- tw-animate-css
- @fontsource-variable/geist

then those dependencies MUST also exist in frontend/package.json.

If generating:

frontend/vite.config.js

it MUST import:

import tailwindcss from "@tailwindcss/vite";

and configure:

plugins: [
  react(),
  tailwindcss()
]

If generating:

frontend/main.jsx

or:

frontend/main.tsx

it MUST import:

import "./index.css";

==================================================
VITE CONFIGURATION
==================================================

If generating frontend/vite.config.js, use this configuration pattern:

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    host: "0.0.0.0",
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
});

==================================================
PROJECT STRUCTURE
==================================================

Use ONLY:

backend/

frontend/

Do NOT create:

client/

server/

For frontend use:

React + Vite

Do NOT use:

react-scripts

==================================================
CODE QUALITY
==================================================

- Complete implementation
- No placeholder functions
- No TODO implementations
- Proper error handling
- Proper validation
- Clean formatting
- Consistent naming
- Production-style structure
- Responsive frontend
- Consistent UI design
- Functional API integration

==================================================
FINAL VALIDATION BEFORE RESPONSE
==================================================

Before returning the response, internally verify:

1. Every requested file exists in the response.

2. Number of generated files equals number of requested files.

3. Every import points to an existing file or installed dependency.

4. Every frontend API call matches a backend route (method AND full path,
   including the /api prefix added by the api client).

5. Every route/controller function name matches.

6. Every model reference exists.

7. Every frontend dependency exists in package.json.

8. Tailwind CSS is correctly configured.

9. frontend/vite.config.js contains @tailwindcss/vite when Tailwind is used.

10. frontend/index.css imports tailwindcss.

11. main.jsx imports index.css.

12. Frontend components are properly styled using Tailwind utilities.

13. No important page is left with browser-default styling.

14. Do not generate undefined custom CSS classes.

15. The backend starts and calls app.listen() without MONGO_URI,
    and never calls process.exit() because MongoDB is unavailable.

16. Every data operation works in JSON mode (backend/data/*.json)
    when MONGO_URI is not set.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Exactly:

{
  "files": [
    {
      "path": "file-path",
      "content": "complete source code"
    }
  ]
}

The number of generated files MUST equal the number of requested files.

Do NOT include markdown.

Do NOT include code fences.

Do NOT include explanations outside JSON.
`;

  return await generateWithAI(batchPrompt);
};

export default generateBatchCode;