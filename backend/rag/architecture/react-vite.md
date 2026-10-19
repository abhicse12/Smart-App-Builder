# React + Vite Architecture Rules

These rules apply when the selected technology includes:

- React
- Vite
- React + Vite

---

## 1. Architecture

Generate a frontend application using:

- React
- Vite
- JavaScript or JSX

Do not use:

- Static-only HTML architecture
- Next.js
- Angular
- Vue
- Backend code inside the frontend
- Node.js/Express backend unless explicitly selected

---

## 2. Mandatory Project Structure

For every React + Vite project, the React application MUST be
contained inside a `frontend/` directory.

Use:

```text
project-root/
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── hooks/
│   ├── README.md
│   └── .gitignore
├── README.md
└── .gitignore

Create additional folders only when required.
Critical Structure Rule
The React application MUST NOT be generated directly in the
project root.
Do NOT create:
project-root/package.json
project-root/vite.config.js
project-root/src/

Instead create:
project-root/frontend/package.json
project-root/frontend/vite.config.js
project-root/frontend/src/

The frontend/ directory is mandatory for React + Vite projects
because the App Builder runtime expects the React application inside
this directory.
3. React Entry Point
The application must have a valid React entry point.
Typical structure:
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(
  document.getElementById("root")
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

The exact implementation may vary, but the entry point must
correctly mount the React application.
src/main.jsx must exist inside:
frontend/src/main.jsx

4. Vite Configuration
Use Vite as the development and build tool.
frontend/vite.config.js must match the generated project.
Example:
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
});

Do not introduce configuration that is not required.
5. package.json
The React frontend must contain a valid:
frontend/package.json

At minimum, dependencies should match the generated code.
Typical dependencies may include:
- react
- react-dom
Development dependencies may include:
- vite
- @vitejs/plugin-react
Only include libraries that are actually used.
The frontend package.json must contain working scripts such as:
{
  "scripts": {
    "dev": "vite",
    "build": "vite build"
  }
}

6. Components
Break reusable UI into React components.
Examples:
frontend/src/components/
├── Navbar.jsx
├── Footer.jsx
├── Button.jsx
└── Card.jsx

Avoid putting the entire application into one extremely large
component.
Components should have clear responsibilities.
7. Pages
When the application contains multiple screens, organize them under:
frontend/src/pages/

Examples:
pages/
├── Home.jsx
├── Login.jsx
├── Dashboard.jsx
└── Profile.jsx

Use React Router only when routing is actually required.
8. Routing
If multiple application routes are required, use React Router.
Example:
import {
  BrowserRouter,
  Routes,
  Route
} from "react-router-dom";

Routes must correspond to actual pages/components.
Do not create routes for pages that do not exist.
9. API Communication
Keep API communication separate from UI components when practical.
Prefer:
frontend/src/services/api.js

Example:
const API_BASE_URL = "/api";

export async function getItems() {
  const response = await fetch(
    `${API_BASE_URL}/items`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch items");
  }

  return response.json();
}

Do not scatter duplicate API logic throughout components.
10. Backend Communication
For a React-only project, do not create a backend.
If the selected stack also contains a backend, follow the
corresponding backend architecture rules.
For example:
MERN
→ React + Vite frontend
→ Node + Express backend

The frontend must communicate with the backend through HTTP APIs.
11. State Management
Use React state for local component state.
Example:
const [items, setItems] = useState([]);

Use Context or a state-management library only when the application's
complexity requires it.
Do not introduce Redux unnecessarily.
12. Authentication State
If authentication is required, maintain authentication state
consistently.
Handle:
- Logged-in state
- Logged-out state
- Loading state
- Authentication errors
Protected pages should not be accessible when authentication is
required and the user is unauthenticated.
For a demo-only frontend application, local browser storage may be
used.
For a full-stack application, authentication must follow the backend
authentication architecture.
13. Forms
React forms should include:
- Controlled inputs where appropriate
- Validation
- Loading state
- Error state
- Success feedback
Example:
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

Do not allow repeated submissions while an important request is still
processing unless intentional.
14. Loading and Error States
Asynchronous UI operations should provide appropriate feedback.
Example:
if (loading) {
  return <p>Loading...</p>;
}

if (error) {
  return <p>{error}</p>;
}

Do not leave users without feedback during API or data operations.
15. Styling
Use the styling approach selected by the application.
If Tailwind CSS is selected, use Tailwind consistently.
If normal CSS is selected, use CSS files.
Do not mix multiple styling systems unnecessarily.
Responsive design must support:
- Mobile
- Tablet
- Desktop
16. Environment Variables
Frontend environment variables must follow Vite conventions.
Example:
VITE_API_URL=http://localhost:5000

Access them using:
import.meta.env.VITE_API_URL

Never expose private secrets through frontend environment variables.
Anything beginning with VITE_ should be considered publicly
accessible.
17. Full-Stack Development Proxy
When the React frontend communicates with a local backend, Vite may
use a development proxy.
Example:
server: {
  proxy: {
    "/api": {
      target: "http://localhost:5001",
      changeOrigin: true
    }
  }
}

The proxy target must match the actual backend runtime configuration.
Do not hardcode an incorrect backend port.
18. Docker Compatibility
The generated React application must work with the App Builder Docker
runtime.
The project must have:
- frontend/package.json
- Valid Vite configuration
- Valid React entry point
- Correct dependencies
- Working build command
- Working development command
Typical commands executed inside the frontend/ directory:
npm install
npm run build
npm run dev -- --host 0.0.0.0 --port 5173

The React application must be runnable from:
/app/frontend

19. File Consistency
Verify:
- frontend/index.html contains the React root element
- frontend/src/main.jsx mounts to the correct root element
- Imported components exist
- Imported CSS files exist
- Dependencies exist in frontend/package.json
- Routes point to valid components
- API service paths are valid
- Environment variables are correctly named
- All React source files are inside frontend/src/
20. Runtime Structure Validation
Before completing the architecture, verify that the generated
structure is compatible with the App Builder runtime.
The following files MUST exist for a React + Vite application:
frontend/package.json
frontend/index.html
frontend/vite.config.js
frontend/src/main.jsx
frontend/src/App.jsx

The following files MUST NOT exist at the project root for a
React + Vite frontend:
package.json
vite.config.js
src/main.jsx
src/App.jsx

21. Final Validation
Before completing the architecture, verify:
- React is used correctly
- Vite is configured correctly
- frontend/package.json is valid
- React entry point exists
- Components are valid
- Routes are valid
- Imports resolve correctly
- API communication is consistent
- Styling works
- Responsive design works
- Loading/error states exist where needed
- Docker runtime can start the application
- The React application is located inside frontend/
- No unnecessary backend technology has been introduced
- No React/Vite files are incorrectly placed at the project root