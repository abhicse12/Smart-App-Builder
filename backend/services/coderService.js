import generateWithAI from "./aiService.js";

const generateFileCode = async ({
  projectName,
  description,
  techStack,
  file,
  allFiles,
}) => {
  const coderPrompt = `
You are the Coder Agent in an AI application builder.

Project Name:

${projectName}

Project Description:

${description}

Technology Stack:

${techStack.join(", ")}

Generate ONLY this file:

Path:

${file.path}

Purpose:

${file.purpose}

Complete project structure:

${allFiles.map((f) => `- ${f.path}`).join("\n")}

==================================================
IMPORTANT RULES
==================================================

1. Generate complete production-ready code.

2. Generate only the requested file.

3. Do not use markdown.

4. Do not use code fences.

5. Do not add explanations.

6. Every import must reference an existing file.

7. Include all necessary logic.

8. Do not use placeholder code.

9. Use proper formatting.

10. Do not change the application's business logic.

11. Follow the architecture blueprint exactly.

==================================================
FRONTEND STYLING RULES
==================================================

If the requested file belongs to frontend/ and is a React JSX/TSX component:

1. Use Tailwind CSS utility classes for styling.

2. Do NOT generate plain unstyled HTML.

3. Do NOT use arbitrary custom className values such as:

- dashboard
- card
- stats-grid
- login-page
- billing-page
- navbar
- sidebar

unless the corresponding CSS definitions are also generated in a CSS file.

4. Prefer Tailwind utility classes such as:

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

5. Every visible page and component must have proper:

- spacing
- typography
- colors
- borders
- cards/containers
- buttons
- forms
- responsive layout

6. Use a consistent modern production-style UI.

7. Make the frontend responsive for mobile, tablet and desktop.

8. Do not create CSS class names that have no corresponding CSS definition.

==================================================
TAILWIND CONFIGURATION RULES
==================================================

If generating frontend/index.css:

It MUST contain:

@import "tailwindcss";

If tw-animate-css is used, include:

@import "tw-animate-css";

If @fontsource-variable/geist is used, include:

@import "@fontsource-variable/geist";

Do NOT import:

@import "shadcn/tailwind.css";

unless the shadcn package/setup actually exists in frontend/package.json.

If generating frontend/package.json, it MUST include:

- tailwindcss
- @tailwindcss/vite

If the project uses:

- tw-animate-css
- @fontsource-variable/geist

then those dependencies MUST also exist in frontend/package.json.

If generating frontend/vite.config.js, it MUST configure Tailwind CSS v4 using:

import tailwindcss from "@tailwindcss/vite";

and:

plugins: [
  react(),
  tailwindcss()
]

If generating frontend/main.jsx or frontend/main.tsx, it MUST import:

import "./index.css";

==================================================
API CONFIGURATION RULES
==================================================

For frontend API calls:

1. Use a centralized API client such as:

frontend/src/services/api.js

2. The API client should use:

baseURL: "/api"

3. Do NOT hardcode:

http://localhost:5000

or

http://localhost:5001

inside React components.

4. Frontend requests must use the centralized API client.

Examples:

api.get("/patients")

api.post("/patients", data)

5. Frontend API paths must correspond to existing backend routes.

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
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Required response format:

{
  "path": "${file.path}",
  "content": "complete source code here"
}

Do not include markdown.

Do not include code fences.

Do not include explanations outside JSON.
`;

  return await generateWithAI(coderPrompt);
};

export default generateFileCode;