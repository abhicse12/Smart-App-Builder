# MERN Applications

Use the MERN architecture when MongoDB, Express, React, and Node.js are selected or explicitly requested.

## 1. MERN Architecture

A MERN application normally follows this flow:

React Frontend
→ Express API
→ Controller/Service
→ MongoDB

The frontend should communicate with the backend through REST APIs rather than directly accessing MongoDB.

## 2. Project Structure

The application should normally contain:

- backend/
- frontend/

### Backend

- backend/server.js
- backend/app.js
- backend/package.json
- backend/config/
- backend/config/db.js when MongoDB is used
- backend/models/
- backend/controllers/
- backend/routes/
- backend/services/ when business logic requires separation
- backend/middleware/ when required
- backend/.env
- backend/.env.example

### Frontend

- frontend/package.json
- frontend/index.html
- frontend/vite.config.js
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/components/
- frontend/src/pages/
- frontend/src/services/
- frontend/src/hooks/ when reusable React logic is required

## 3. Backend API Design

Backend APIs should be represented by corresponding routes and controllers.

Example:

- routes/userRoutes.js
- controllers/userController.js

Routes should define API endpoints while controllers should handle request/response logic.

Business logic should be placed in services when the application becomes sufficiently complex.

## 4. Frontend API Communication

Frontend API communication should use a centralized API service.

Do not scatter repeated fetch or Axios configuration throughout components.

The API service should centralize:

- Backend base URL
- HTTP requests
- Authentication credentials
- Common error handling

## 5. React Application

Use React components to build the frontend.

Use React Router when the application requires multiple pages.

Pages should normally be organized inside:

- src/pages/

Reusable UI components should normally be organized inside:

- src/components/

## 6. MongoDB and Mongoose

When MongoDB is selected, use Mongoose for database interaction.

The MongoDB connection should normally be implemented in:

- backend/config/db.js

Database models should normally be implemented inside:

- backend/models/

Database models should define canonical field names that are used consistently throughout the application.

Do not use different field names for the same concept across models, controllers, and frontend code.

## 7. Database Configuration

MongoDB connection strings must be stored in environment variables.

Example:

MONGO_URI=your_mongodb_connection_string

Never hardcode database credentials in generated source code.

## 8. Authentication

For applications requiring authentication:

- Hash passwords before storing them.
- Use JWT or another appropriate authentication mechanism.
- Return the JWT in the login/signup JSON ({ token, user }); the frontend sends it
  as "Authorization: Bearer <token>". Generated apps do not use auth cookies.
- Protect authenticated API routes using authentication middleware.
- Check authorization before allowing users to access protected resources.

Authentication logic should not be duplicated across individual controllers.

## 9. Authorization and Ownership

When resources belong to users, backend queries must verify ownership.

For example, a project API should not return or modify another user's project simply because the project ID is known.

Authorization must be enforced on the backend and must not rely only on frontend route protection.

## 10. API Request and Response Handling

Validate incoming request data.

Use appropriate HTTP status codes.

Responses should follow a consistent structure.

Example:

{
  "success": true,
  "message": "Operation successful",
  "data": {}
}

Errors should provide useful messages without exposing sensitive internal information.

## 11. Error Handling

Backend errors should be handled consistently.

Avoid exposing:

- Database credentials
- JWT secrets
- Internal file paths
- Stack traces
- Sensitive environment variables

Use centralized error handling when appropriate.

## 12. Demo-First Full-Stack Mode

Generated MERN applications should remain runnable without requiring external MongoDB credentials.

When external database credentials are unavailable:

- Use local JSON or mock persistence.
- Keep the API structure functional.
- Keep frontend/backend communication functional.
- Do not hardcode fake production credentials.

When MongoDB credentials are available, use MongoDB and Mongoose normally.

External services may be represented using:

- .env.example
- README configuration instructions

The generated application should still run without those external credentials whenever possible.

## 13. Environment Variables

Use environment variables for configuration and secrets.

Examples:

- MONGO_URI
- JWT_SECRET
- PORT
- CLIENT_URL
- API_URL

Never hardcode secrets, API keys, database passwords, or authentication credentials.

## 14. CORS

Configure CORS according to the frontend origin.

During local development, the frontend and backend may run on different ports.

Production CORS configuration should allow only trusted origins.

## 15. Authentication State in React

The frontend should determine authentication state through the backend rather than trusting client-side storage alone.

The api client adds "Authorization: Bearer <token>" to every request (axios interceptor).
Keep the auth state in React state (AuthContext) so routes re-render after login.

Protected frontend routes should redirect unauthenticated users to the login page.

Backend authentication remains the final authority.

## 16. Loading and Error States

React pages that communicate with APIs should handle:

- Loading state
- Success state
- Empty state
- Error state

Do not leave API failures unhandled in the UI.

## 17. CRUD Applications

For CRUD applications, follow this pattern:

React UI
→ API service
→ Express route
→ Controller
→ Service when required
→ Mongoose model
→ MongoDB

Each CRUD operation should have a clear API endpoint.

## 18. File Uploads

When file uploads are required:

- Validate file type.
- Validate file size.
- Avoid unsafe file paths.
- Do not trust user-provided filenames.
- Store uploaded files safely.
- Do not execute uploaded files.

## 19. Security

Generated MERN applications should follow secure development practices.

Important rules:

- Validate user input.
- Hash passwords.
- Protect authentication secrets.
- Never return password hashes; keep the JWT secret in process.env.JWT_SECRET.
- Restrict CORS.
- Prevent unauthorized resource access.
- Avoid exposing sensitive errors.
- Avoid hardcoded secrets.
- Validate uploaded files.

## 20. Docker

MERN applications should be structured so that frontend and backend can be containerized when required.

The generated application should not depend on the host machine's specific directory structure.

Docker configuration should use environment variables for runtime configuration.

## 21. Generated MERN Application Requirements

When generating a MERN application:

1. Generate both frontend and backend when full-stack functionality is requested.
2. Generate corresponding API routes and controllers for frontend features requiring backend functionality.
3. Generate Mongoose models when MongoDB is required.
4. Use demo-first local persistence when external MongoDB credentials are unavailable.
5. Keep frontend API communication centralized.
6. Keep authentication and authorization logic on the backend.
7. Use environment variables for configuration and secrets.
8. Keep database field names consistent across the application.
9. Ensure the generated project can run locally.
10. Avoid unnecessary dependencies and configuration.

## 22. Technology Selection Rule

Use MERN when the requested application requires:

- React
- Node.js
- Express
- MongoDB

If the user explicitly requests Python FastAPI or Java Spring Boot, use the corresponding backend technology instead of MERN.

If only a static frontend is required, do not generate a complete MERN backend unnecessarily.

## 23. RAG and Agent Usage

When generating a MERN application, combine:

- Common architecture knowledge
- Common API design rules
- Common security rules
- React/Vite knowledge
- Node/Express knowledge
- MERN-specific knowledge

MERN-specific rules should take precedence when they provide more specific implementation guidance.