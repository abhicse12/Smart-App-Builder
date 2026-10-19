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

## Implementation Completeness Rules

The architecture is the source of truth.

You MUST implement every feature and requirement defined by the
architecture completely.

Do not skip functionality.

For every feature, verify all required layers before considering
implementation complete.

### CRUD Requirements

If CRUD functionality is requested, implement:

CREATE:
- Frontend form/UI
- Frontend API/service function
- Backend POST route
- Backend controller
- Persistence/demo-mode logic
- Success/error handling
- Frontend state update

READ:
- Frontend display/list UI
- Frontend GET API/service function
- Backend GET route
- Backend controller
- Persistence/demo-mode logic
- Loading/error states

UPDATE:
- Frontend edit UI/action
- Frontend PUT/PATCH API function
- Backend PUT/PATCH route
- Backend controller
- Persistence/demo-mode logic
- Frontend state update

DELETE:
- Visible Delete button/action in the UI
- Frontend DELETE API/service function
- Backend DELETE route
- Backend controller
- Persistence/demo-mode deletion
- Frontend state update after deletion
- Error handling

If filtering, searching, sorting, pagination, or any other feature
is requested, implement the complete functionality across the required
layers.

### Authentication Requirements

If authentication is requested, implement a complete working flow:

SIGNUP:
- Signup page/UI
- Name, email, password and required validation
- Frontend signup API function
- Backend signup route
- Backend controller
- User storage
- Duplicate email validation
- Password hashing

LOGIN:
- Login page/UI
- Email and password fields
- Frontend login API function
- Backend login route
- Backend controller
- Credential validation
- Authentication state
- Success/error handling
- Redirect after successful login

DEMO AUTHENTICATION:
- Do NOT require an external database.
- Store demo users in a local JSON file such as:
  backend/data/users.json
- Signup must write the new user to the JSON file.
- Login must read users from the JSON file and validate credentials.
- Passwords must be hashed and must never be stored as plaintext.

LOGOUT:
- Provide a visible logout action.
- Clear authentication state.
- Redirect the user appropriately.

PROTECTED APPLICATION:
- If the architecture requires protected pages, unauthenticated
  users must not be able to access them.
- Authenticated users must be able to access the application normally.

### Frontend ↔ Backend Integration

Every interactive frontend feature must be connected to its backend
functionality when a backend is required.

Do NOT generate:

- UI without its API
- API without its UI when the feature requires user interaction
- Route without controller logic
- Controller without persistence logic
- API function that is never used
- Delete API without a Delete UI action
- Login API without Login UI
- Signup API without Signup UI

### Demo-First Requirement

When the architecture specifies demo mode:

- The application MUST work without external database credentials.
- Use local JSON/mock persistence where appropriate.
- External services must not be required for the basic application
  to run.
- Keep external configuration in .env.example and document it when
  necessary.

### Final Implementation Check

Before finishing code generation, compare the generated code against
the architecture and verify:

1. Every requested feature exists.
2. Every feature has all required layers.
3. Every frontend action is connected.
4. Every API function is connected to a route.
5. Every route has a working controller.
6. Every persistence operation is implemented.
7. CRUD operations are complete when requested.
8. Authentication is complete when requested.
9. No requested functionality is missing.

If something is missing, implement it before returning the generated
code.
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