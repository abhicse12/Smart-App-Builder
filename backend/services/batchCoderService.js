import generateWithAI from "./aiService.js";
import retrieveRelevantKnowledge from "./retrievalService.js";

const generateBatchCode = async ({
  projectName,
  description,
  techStack,
  files,
  allFiles,
}) => {
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
BILLING RULES
==================================================

This application uses DAILY billing.

NEVER convert the billing system to hourly billing.

Use these concepts:

- numberOfDays
- nurseDailyRate
- patientDailyRate
- nurseAmount
- patientAmount
- companyMargin

Calculations:

Patient Amount =
numberOfDays × patientDailyRate

Nurse Amount =
numberOfDays × nurseDailyRate

Company Margin =
patientAmount - nurseAmount

Do NOT use:

- hoursWorked
- hourlyRate
- hourlyRatePaidToNurse
- hourlyRateChargedToPatient

unless they explicitly exist in the architecture blueprint.

Billing calculations MUST be performed on the backend.

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
FRONTEND / BACKEND CONSISTENCY
==================================================

Every frontend API request must correspond to an existing backend route.

Use the exact API paths defined by the backend architecture.

Do not invent API endpoints.

Frontend API requests must use the centralized API client.

Do NOT hardcode backend URLs inside React components.

Use:

api.get("/patients")

api.post("/patients", data)

instead of:

fetch("http://localhost:5001/api/patients")

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

4. Every API endpoint exists in the backend architecture.

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