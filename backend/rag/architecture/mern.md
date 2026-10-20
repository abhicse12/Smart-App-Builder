# MERN Architecture Rules

These rules apply when the selected technology stack is:

- MERN
- MongoDB
- Express
- React
- Node.js

## 1. Architecture

Generate a full-stack MERN application using:

- React + Vite for frontend
- Node.js + Express for backend
- MongoDB + Mongoose for database when database functionality is required

Recommended architecture:

```text
User
 ↓
React Frontend
 ↓
Express API
 ↓
Controller / Service
 ↓
Mongoose
 ↓
MongoDB

Keep frontend and backend clearly separated.
2. Recommended Project Structure
Use:
project/
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
│   └── .gitignore
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── app.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── services/
│
├── .env.example
├── README.md
└── .gitignore

Use additional files only when required.
3. Frontend
The frontend must use:
- React
- Vite
- JSX
- React components
Follow the React + Vite architecture rules.
Use:
frontend/src/components/
frontend/src/pages/
frontend/src/services/
frontend/src/hooks/

when the application requires them.
Do not put backend code inside the frontend.
4. Backend
The backend must use:
- Node.js
- Express
Recommended flow:
Route
 ↓
Controller
 ↓
Service
 ↓
Model / Database

Keep responsibilities separated.
Example:
routes/userRoutes.js
controllers/userController.js
services/userService.js
models/User.js

For simple applications, a service layer may be omitted when it provides no meaningful benefit.
5. Express Application
app.js should configure:
- Express
- JSON parsing
- CORS when required
- API routes
- Error handling
Example:
import express from "express";

const app = express();

app.use(express.json());

export default app;

server.js should be responsible for starting the server.
Example:
import app from "./app.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

6. API Routes
API routes should use REST-style conventions where appropriate.
Example:
GET    /api/products
GET    /api/products/:id
POST   /api/products
PUT    /api/products/:id
DELETE /api/products/:id

Routes must match the frontend API calls exactly.
7. Controllers
Controllers should handle HTTP-level concerns.
Typical responsibilities:
- Read request data
- Validate input
- Call service/model logic
- Return HTTP response
- Handle errors
Avoid placing the entire application's business logic inside route files.
8. MongoDB and Mongoose
When MongoDB is required, use Mongoose.
Example model:
import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Product",
  productSchema
);

Use schemas that match the application's actual data requirements.
9. Database Configuration
Keep database connection logic separate.
Recommended:
backend/config/db.js

Example:
import mongoose from "mongoose";

const connectDB = async () => {
  await mongoose.connect(
    process.env.MONGO_URI
  );

  console.log("MongoDB connected");
};

export default connectDB;

Never hardcode database credentials.
10. Demo-First Full-Stack Mode
The generated MERN application must remain runnable without external database credentials when possible.
If MongoDB credentials are not available, implement the application's core functionality using local mock/JSON persistence.
For example:
backend/data/
└── products.json

The application should still demonstrate:
- API routes
- CRUD operations
- Frontend/backend communication
- Business logic
- Error handling
External MongoDB configuration can be provided through:
.env.example
README.md

Do not make the generated demo unusable simply because MongoDB credentials are unavailable.
11. Authentication
When authentication is required, implement it on the backend.
Typical architecture:
React Login
 ↓
POST /api/auth/login
 ↓
Express
 ↓
Authentication Logic
 ↓
Session / JWT

Passwords must never be stored as plain text.
Use a secure password hashing library.
Authentication secrets must come from environment variables.
12. Authorization
Authentication and authorization are different.
Authentication answers:
Who is the user?

Authorization answers:
Is this user allowed to perform this action?

Protected backend resources must verify authorization.
For user-owned resources, verify ownership before:
- Reading private data
- Updating data
- Deleting data
Never trust a user-provided ID alone.
13. Frontend API Service
Centralize API communication where practical.
Recommended:
frontend/src/services/api.js

Example:
const API_BASE_URL = "/api";

export async function getProducts() {
  const response = await fetch(
    `${API_BASE_URL}/products`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch products"
    );
  }

  return response.json();
}

Frontend endpoints must exactly match backend routes.
14. CORS
If frontend and backend run on different origins during development, configure CORS appropriately.
Example:
import cors from "cors";

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

Do not allow unrestricted origins unnecessarily.
Generated apps authenticate with a JWT returned in the login JSON and sent as
"Authorization: Bearer <token>" (no cookies), so cors() needs no credentials.
15. Environment Variables
Use environment variables for:
PORT
MONGO_URI
JWT_SECRET
API keys
External service configuration

Provide:
.env.example

Never commit real secrets.
Frontend variables exposed through Vite must not contain private secrets.
16. Error Handling
The backend should provide consistent error responses.
Example:
{
  "success": false,
  "message": "Product not found"
}

Use appropriate HTTP status codes.
Examples:
200 → Success
201 → Created
400 → Bad Request
401 → Unauthenticated
403 → Forbidden
404 → Not Found
500 → Server Error

17. Frontend States
The React frontend must handle:
- Loading
- Success
- Error
- Empty data
- Authentication state where required
Do not assume every API request succeeds.
18. CRUD Consistency
For CRUD applications, verify the complete flow:
React
 ↓
API Request
 ↓
Express Route
 ↓
Controller
 ↓
Service / Model
 ↓
Database or Mock Persistence
 ↓
Response
 ↓
React State Update

All layers must agree on:
- Field names
- Data types
- Route names
- HTTP methods
- Response structure
19. File Uploads
If file uploads are required:
- Use appropriate multipart/form-data handling
- Validate file type where appropriate
- Validate file size
- Do not trust user-provided filenames
- Keep uploaded files outside source code when appropriate
If external storage is required, provide a demo/mock implementation when credentials are unavailable.
20. Security
Follow basic security practices.
Do not:
- Hardcode secrets
- Store plain-text passwords
- Trust client-side authorization
- Expose private database credentials
- Accept arbitrary sensitive input without validation
Validate and sanitize input where appropriate.
21. Docker Compatibility
The generated MERN application must work with the App Builder Docker runtime.
Frontend:
frontend/

Backend:
backend/

Both projects must have valid package.json files.
The generated commands must match the actual project.
Frontend should support:
npm install
npm run build
npm run dev -- --host 0.0.0.0 --port 5173

Backend should support a valid Node.js startup command.
22. Frontend-Backend Port Configuration
Keep the ports consistent.
Example:
Frontend → 5173
Backend  → 5001

If Vite proxy is used:
/api → http://localhost:5001

The actual generated configuration must match the runtime environment.
Never create a proxy target that points to a nonexistent backend port.
23. Import and Export Consistency
Verify every import.
Example:
import userController from "../controllers/userController.js";

The referenced file and exported value must actually exist.
For ES modules, maintain consistent import/export syntax throughout the backend.
24. README
The README must explain:
- Application purpose
- MERN architecture
- Frontend setup
- Backend setup
- Environment variables
- Database configuration
- API endpoints
- Demo/mock mode
- How to run the project
Instructions must match the generated files and commands.
25. Final Validation
Before completing the architecture, verify:
- React + Vite frontend exists
- Node + Express backend exists
- Frontend/backend are separated
- API routes match frontend calls
- Controllers match routes
- Models match application data
- Database configuration is valid
- Mock persistence works when external DB is unavailable
- Authentication is secure when required
- Authorization checks ownership when required
- Environment variables are consistent
- CORS configuration is correct
- Docker runtime can start the project
- No conflicting technology has been introduced