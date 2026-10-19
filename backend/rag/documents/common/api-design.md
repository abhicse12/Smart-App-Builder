# API Design Guidelines

## Purpose

Design APIs that are simple, predictable, secure, and easy for frontend applications to consume.

These guidelines are technology-independent and can be implemented using Node.js/Express, Python/FastAPI, Java/Spring Boot, or other backend frameworks.

---

## 1. REST API Structure

Use resource-based URLs.

Good examples:

GET    /api/users
GET    /api/users/:id
POST   /api/users
PUT    /api/users/:id
PATCH  /api/users/:id
DELETE /api/users/:id

Avoid action-based URLs when a REST resource operation can be used.

Avoid:

POST /api/createUser
POST /api/deleteUser

Prefer:

POST   /api/users
DELETE /api/users/:id

---

## 2. HTTP Methods

Use HTTP methods according to their purpose.

GET:
- Retrieve data.
- Should not modify server state.

POST:
- Create a new resource.
- Can also be used for operations that do not fit standard CRUD.

PUT:
- Replace an existing resource.

PATCH:
- Partially update an existing resource.

DELETE:
- Delete a resource.

---

## 3. HTTP Status Codes

Use meaningful HTTP status codes.

200 OK:
- Successful request.

201 Created:
- Resource successfully created.

204 No Content:
- Successful request with no response body.

400 Bad Request:
- Invalid request data.

401 Unauthorized:
- Authentication is required or authentication failed.

403 Forbidden:
- User is authenticated but does not have permission.

404 Not Found:
- Requested resource does not exist.

409 Conflict:
- Request conflicts with existing data.

422 Unprocessable Entity:
- Request format is valid but validation failed.

500 Internal Server Error:
- Unexpected server-side error.

---

## 4. Request Validation

Validate user input before processing it.

Validate:

- Required fields
- Data types
- String length
- Email format
- Numeric ranges
- Allowed values
- IDs and identifiers

Never blindly trust data received from the client.

Example:

POST /api/users

Request:

{
  "name": "Abhishek",
  "email": "user@example.com",
  "age": 22
}

The backend should validate the request before creating the user.

---

## 5. Consistent Response Format

Use a predictable response structure.

Success example:

{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "123",
    "name": "Abhishek"
  }
}

Error example:

{
  "success": false,
  "message": "Invalid email address"
}

For lists:

{
  "success": true,
  "data": [
    {
      "id": "1",
      "name": "User 1"
    },
    {
      "id": "2",
      "name": "User 2"
    }
  ]
}

The exact response structure may vary by generated application, but responses should remain consistent throughout the project.

---

## 6. Error Handling

Do not expose sensitive internal errors to the client.

Bad:

{
  "error": "MongoServerError: authentication failed..."
}

Prefer:

{
  "success": false,
  "message": "Unable to process the request"
}

Log detailed errors on the server when appropriate.

The frontend should receive a safe and useful error message.

---

## 7. Authentication

Protected APIs must verify authentication before accessing user-specific resources.

Example:

GET /api/projects

The backend should identify the authenticated user and return only projects belonging to that user.

Never trust a user ID sent by the frontend when the authenticated identity is already available from the authentication mechanism.

---

## 8. Authorization

Authentication answers:

"Who is the user?"

Authorization answers:

"Is this user allowed to perform this action?"

Example:

A user may be authenticated but should not be allowed to:

- Delete another user's project
- Access another user's private files
- Modify another user's account

Always perform authorization checks on the backend.

---

## 9. Pagination

For APIs returning large collections, use pagination.

Example:

GET /api/projects?page=1&limit=10

Possible response:

{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}

Do not return unnecessarily large datasets in a single response.

---

## 10. Filtering and Sorting

Use query parameters for filtering and sorting.

Examples:

GET /api/products?category=electronics

GET /api/products?sort=price

GET /api/products?search=laptop

Keep filtering and sorting predictable and easy for frontend applications to consume.

---

## 11. API Versioning

For larger applications, APIs may use versioning.

Example:

/api/v1/users
/api/v2/users

For simple generated demo applications, versioning is optional unless explicitly required.

---

## 12. Environment Variables

Never hardcode:

- API keys
- Database passwords
- JWT secrets
- Private credentials
- Production service URLs when they should be configurable

Use environment variables.

Example:

DATABASE_URL=...
JWT_SECRET=...
API_KEY=...

Provide `.env.example` for required configuration.

Never expose server-side secrets to frontend code.

---

## 13. Demo-First Backend

Generated applications should remain runnable without external services whenever possible.

If a database or external API is required:

- Use local JSON/mock persistence for the default demo.
- Keep API routes functional.
- Provide `.env.example` for optional external services.
- Document external configuration in README.
- Never hardcode API credentials.

Example:

Instead of requiring MongoDB immediately:

GET /api/products

can initially read from:

data/products.json

The generated application should still demonstrate the complete frontend-backend flow.

---

## 14. API and Frontend Integration

The frontend should communicate with the backend through API endpoints.

Example:

Frontend:

fetch("/api/products")

Backend:

GET /api/products

Avoid placing backend business logic directly inside frontend components.

Keep responsibilities separated:

Frontend:
- UI
- User interaction
- API calls
- Client-side state

Backend:
- Authentication
- Authorization
- Validation
- Business logic
- Data access
- API responses

---

## 15. Security Rules

APIs should:

- Validate input
- Authenticate protected requests
- Authorize resource access
- Avoid exposing sensitive errors
- Avoid hardcoded secrets
- Prevent unauthorized access to other users' data
- Use HTTPS in production
- Apply rate limiting where appropriate

Security-specific implementation details are defined in `security.md`.

---

## 16. API Documentation

Generated projects should document important API endpoints in the README.

Example:

### Get Projects

GET /api/projects

Description:
Returns projects belonging to the authenticated user.

### Create Project

POST /api/projects

Request:

{
  "name": "My Project",
  "description": "Demo project"
}

Response:

{
  "success": true,
  "message": "Project created successfully"
}

---

## 17. API Generation Rules for AI Agents

When generating backend code:

1. Identify required resources.
2. Define appropriate API endpoints.
3. Choose correct HTTP methods.
4. Validate incoming data.
5. Implement authentication where required.
6. Implement authorization for protected resources.
7. Keep business logic separate from route definitions when practical.
8. Return consistent responses.
9. Handle errors safely.
10. Use environment variables for secrets.
11. Prefer mock/local persistence for demo applications.
12. Ensure the generated API can run without external credentials unless explicitly required.

---

## 18. Technology Independence

These API design rules are common concepts.

Technology-specific implementation should come from the relevant backend knowledge file:

- Node.js + Express → `backend/node-express.md`
- Python + FastAPI → `backend/python-fastapi.md`
- Java + Spring Boot → `backend/java-springboot.md`
- MERN → `backend/mern.md`

Do not use framework-specific syntax from this document.

The Architect Agent should use these guidelines to design the API, while the Coder Agent should use the technology-specific knowledge to implement it.