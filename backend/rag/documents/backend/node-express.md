# Node.js + Express Backend Guidelines

## Purpose

This document contains Node.js and Express-specific implementation knowledge for generating backend applications.

Use this document when the selected backend technology is:

- Node.js
- Express.js
- Node.js + Express
- MERN backend

Common concepts such as API design, authentication, and security should be retrieved from the common knowledge documents.

---

## 1. Project Structure

Prefer a clean backend structure.

Example:

backend/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── utils/
├── data/
├── app.js
├── server.js
├── package.json
├── .env
└── .env.example

For small applications, a simpler structure is acceptable.

Do not create unnecessary folders for very small applications.

---

## 2. Express Application Setup

Basic Express application:

```js
import express from "express";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API is running",
  });
});

export default app;

The application should keep server startup separate when practical.
Example:
app.js
Contains Express configuration and routes.
server.js
Starts the HTTP server and performs startup operations such as database connection.

3. Package Configuration
Typical dependencies:
{
  "dependencies": {
    "express": "^5.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  }
}

Use versions compatible with the generated project.
Do not add dependencies that are not required.

4. Environment Variables
Load environment variables using dotenv when required.
Example:
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 5000;

Use .env.example to document required variables.
Example:
PORT=5000
JWT_SECRET=your-secret
DATABASE_URL=your-database-url

Never commit real secrets.

5. Routes
Keep API routes separate from the main application when the project has multiple resources.
Example:
routes/userRoutes.js
import express from "express";
import {
  getUsers,
  createUser,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/", getUsers);
router.post("/", createUser);

export default router;

Register the route in app.js:
app.use("/api/users", userRoutes);

6. Controllers
Controllers should handle HTTP request and response logic.
Example:
export const getUsers = async (req, res) => {
  try {
    const users = [];

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get Users Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

Avoid putting large business logic directly inside route definitions.

7. Services
Use services for reusable or complex business logic.
Example:
export const calculateTotal = (items) => {
  return items.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
};

Controllers can call services instead of containing all business logic.

8. Middleware
Express middleware can be used for:
- Authentication
- Authorization
- Validation
- Logging
- Rate limiting
- Error handling
Example:
const middleware = (req, res, next) => {
  // middleware logic

  next();
};

export default middleware;

Register middleware at the appropriate scope.
Global middleware:
app.use(express.json());

Route-specific middleware:
router.post(
  "/",
  authMiddleware,
  createProject
);

9. Authentication Middleware
Protected routes should use authentication middleware.
Example JWT flow:
import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

export default authMiddleware;

The exact authentication mechanism should depend on the generated application's requirements.

10. Cookie-Based Authentication
If cookie-based JWT authentication is selected, use:
import cookieParser from "cookie-parser";

app.use(cookieParser());

Set authentication cookies using secure cookie options.
Development example:
res.cookie("token", token, {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
});

Production should use HTTPS and:
secure: true

Frontend requests using cookies must include credentials.
11. CORS
For a separate frontend and backend:
import cors from "cors";

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

Do not blindly allow every origin in production.
12. Error Handling
Express supports centralized error-handling middleware.
Example:
const errorHandler = (
  err,
  req,
  res,
  next
) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};

export default errorHandler;

Register it after routes:
app.use(errorHandler);

Do not expose stack traces or sensitive internal details to clients.
13. Async Error Handling
Async controllers should handle errors properly.
Example:
export const createUser = async (req, res) => {
  try {
    // async operation

    res.status(201).json({
      success: true,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create User Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
};

14. MongoDB with Mongoose
If MongoDB is selected, Mongoose can be used.
Example model:
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "User",
  userSchema
);

15. MongoDB Connection
Keep database connection logic separate.
Example:
import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI
    );

    console.log("MongoDB connected");
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error
    );

    process.exit(1);
  }
};

export default connectDB;

The application should obtain the connection string from an environment variable.
16. Demo-First Persistence
Generated applications should preferably work without requiring MongoDB credentials.
For demo applications, use local JSON persistence when appropriate.
Example:
data/
├── users.json
├── products.json
└── projects.json

Example:
import fs from "fs/promises";

const filePath = "./data/products.json";

const data = await fs.readFile(
  filePath,
  "utf-8"
);

const products = JSON.parse(data);

Use MongoDB only when explicitly required or configured.
The generated project should remain runnable without an external database in demo-first mode.
17. API Routes with Mock Data
Example:
import express from "express";

const router = express.Router();

const products = [
  {
    id: 1,
    name: "Laptop",
    price: 50000,
  },
  {
    id: 2,
    name: "Phone",
    price: 30000,
  },
];

router.get("/", (req, res) => {
  res.json({
    success: true,
    data: products,
  });
});

export default router;

This is useful when generating a standalone demo application.
18. Request Body Handling
Enable JSON request parsing:
app.use(express.json());

Access request body:
const { name, email } = req.body;

Never assume the request body is valid.
Validate input before processing it.
19. Query Parameters
Example request:
GET /api/products?search=laptop

Access query parameters:
const { search } = req.query;

Use query parameters for:
- Search
- Filtering
- Sorting
- Pagination
Validate and sanitize values when necessary.
20. URL Parameters
Example:
GET /api/products/123

Access the ID:
const { id } = req.params;

Validate the ID before using it.
21. File Uploads
When file uploads are required, multer can be used.
Example:
import multer from "multer";

const upload = multer({
  dest: "uploads/",
});

router.post(
  "/upload",
  upload.single("file"),
  uploadController
);

Uploaded files must be validated for:
- File type
- File size
- Filename
- Storage location
Do not blindly trust uploaded files.
22. Password Hashing
When implementing user authentication, use a password hashing library such as bcryptjs.
Example:
import bcrypt from "bcryptjs";

const hashedPassword =
  await bcrypt.hash(password, 10);

Verify:
const isMatch =
  await bcrypt.compare(
    password,
    user.password
  );

Never store plain-text passwords.
23. JWT
When JWT authentication is required:
import jwt from "jsonwebtoken";

const token = jwt.sign(
  {
    userId: user._id,
  },
  process.env.JWT_SECRET,
  {
    expiresIn: "1d",
  }
);

Keep the secret in an environment variable.
Do not place sensitive information in the JWT payload.
24. Password and Sensitive Data Responses
Never return password fields.
Bad:
res.json({
  user,
});

if user contains a password hash.
Prefer selecting or constructing safe response data:
res.json({
  success: true,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
  },
});

25. Project Ownership
For multi-user applications, protected resources must be scoped to the authenticated user.
Example:
const projects = await Project.find({
  user: req.user.userId,
});

When accessing one project:
const project = await Project.findOne({
  _id: req.params.id,
  user: req.user.userId,
});

Do not fetch a resource only by ID when ownership matters.
26. API Architecture
Recommended flow:
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
Model / Data Layer
   ↓
Response

For simple applications, some layers may be combined.
Do not create unnecessary abstraction.
27. Server Startup
Typical structure:
server.js
import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

const PORT =
  process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(
    `Server running on port ${PORT}`
  );
});

If a database is required, connect before or during application startup according to the project architecture.
28. Node.js Project Scripts
Typical package.json scripts:
{
  "scripts": {
    "dev": "nodemon server.js",
    "start": "node server.js"
  }
}

Use the correct entry point for the generated project.
29. ES Modules
If the project uses ES modules:
{
  "type": "module"
}

Then imports use:
import express from "express";

instead of:
const express = require("express");

Do not mix CommonJS and ES module syntax unnecessarily.

## Health Check Endpoint

Every generated Node.js / Express backend MUST expose:

GET /health

The endpoint must return HTTP 200 when the server is running.

Required implementation:

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

The /health endpoint must not require authentication.

This endpoint is required because the AI App Builder runtime uses it
to verify that the backend started successfully.

Do not omit this endpoint.

30. Docker
A Node.js backend can be containerized using a Node image.
Example:
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]

The exact Node version should match the generated project requirements.
31. Generated Backend Requirements
When generating a Node.js + Express application:
1. Create a valid package.json.
2. Create the Express application.
3. Configure required middleware.
4. Create API routes.
5. Create controllers when appropriate.
6. Separate complex business logic into services.
7. Validate incoming data.
8. Implement authentication when required.
9. Implement authorization for protected resources.
10. Use environment variables for secrets.
11. Prefer local/mock persistence for demo-first applications.
12. Provide .env.example.
13. Provide README setup instructions.
14. Ensure the application can start successfully.
15. Ensure API endpoints used by the frontend actually exist.
16. Keep the generated project compatible with Docker when Docker execution is required.
32. Technology Selection Rule
Use this document only when the requested backend uses Node.js/Express.
Examples:
"Build a Node.js API"
→ Use Node.js + Express knowledge.
"Build an Express backend"
→ Use Node.js + Express knowledge.
"Build a MERN application"
→ Use Node.js + Express knowledge together with backend/mern.md.
"Build a FastAPI application"
→ Do not use Node.js-specific implementation knowledge.
"Build a Spring Boot application"
→ Do not use Node.js-specific implementation knowledge.
The retrieval system should prefer the technology-specific knowledge matching the user's selected stack.

### Important architecture point

Ab RAG me separation clear ho raha hai:

```text
common/
├── authentication.md   ← common concept
├── api-design.md       ← common concept
├── docker.md           ← common infrastructure
└── security.md         ← common security

backend/
├── node-express.md     ← Node implementation
├── python-fastapi.md   ← Python implementation
├── java-springboot.md  ← Java implementation
└── mern.md             ← MERN stack