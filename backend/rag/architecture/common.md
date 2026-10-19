# Common Architecture Rules

These rules apply to every generated application regardless of the selected technology stack.

## 1. Technology Stack Is a Hard Constraint

The selected technology stack must be followed exactly.

Priority order:

1. Explicitly selected technology stack
2. Explicit technology requested in the user prompt
3. Relevant RAG knowledge
4. Application functionality
5. Safe defaults

Never introduce a technology that conflicts with the selected stack.

---

## 2. Architecture Must Match the Stack

The generated project structure, files, dependencies, commands, and implementation must be consistent with the selected technology.

Do not generate:

- React files for a static HTML/CSS/JS project
- Backend files for a frontend-only project
- Node.js files for a Python FastAPI project
- Python files for a Java Spring Boot project
- MongoDB-specific code unless the selected architecture requires it

---

## 3. File Responsibility

Every generated file must have a clear purpose.

Avoid:

- Duplicate files
- Duplicate functionality
- Unnecessary configuration files
- Unused dependencies
- Empty placeholder files
- Files that are not required by the selected architecture

Keep related functionality organized logically.

---

## 4. Code Consistency

All generated files must work together.

Ensure:

- Imports match actual file paths
- Exported functions/components actually exist
- Routes match frontend API calls
- Environment variables match the code
- Package dependencies match imports
- Configuration files match the selected framework
- Entry points match the selected runtime

Do not reference files, functions, components, routes, packages, or environment variables that do not exist.

---

## 5. API Consistency

If the application contains an API:

- Define clear API routes
- Use consistent HTTP methods
- Use consistent request and response structures
- Handle success and error responses
- Keep frontend API calls consistent with backend routes

Example:

```text
GET    /api/items
GET    /api/items/:id
POST   /api/items
PUT    /api/items/:id
DELETE /api/items/:id

The exact API design should depend on the application requirements.
6. Environment Variables
Never hardcode:
- API keys
- Database credentials
- Authentication secrets
- Private tokens
- Other sensitive configuration
Use environment variables.
Provide .env.example when environment configuration is required.
Document required environment variables in the README.
7. Security
Generated applications should follow basic security practices.
Never expose secrets in:
- Source code
- Frontend JavaScript
- Public configuration
- README examples
Validate user input where appropriate.
Use authentication and authorization when required by the application.
Protect resources that should only be accessible to authenticated users.
8. Demo-First External Services
The generated application should remain runnable without external credentials whenever possible.
For external services such as:
- Databases
- Payment gateways
- Third-party APIs
- Cloud services
- Authentication providers
Prefer a working demo/mock implementation when external credentials are unavailable.
External integration may be documented using:
.env.example
README.md

Do not make the application completely dependent on unavailable external services.
9. Error Handling
Applications must handle expected failures gracefully.
Examples:
- Invalid user input
- Failed API requests
- Missing data
- Authentication failures
- Server errors
- External service failures
Do not silently ignore errors.
Provide useful error responses and user-facing error states where appropriate.
10. Loading and Empty States
User interfaces that perform asynchronous operations should handle:
- Loading state
- Success state
- Error state
- Empty state
Do not leave the interface blank while waiting for an API response.
11. README
Every generated project should contain a README explaining:
- Project purpose
- Technology stack
- Project structure
- Installation steps
- How to run the project
- Environment variables if required
- Available API endpoints if applicable
- Demo/mock behavior when applicable
Instructions must match the actual generated project.
12. Runtime Compatibility
The generated project must be runnable using the runtime environment selected by the App Builder.
Do not introduce commands or dependencies that are incompatible with the configured Docker/runtime environment.
The generated application should have a clear entry point and startup command.
13. Final Architecture Validation
Before considering the architecture complete, verify:
- Selected technology is followed
- Required files exist
- File paths are consistent
- Imports are valid
- Dependencies are declared
- API routes are consistent
- Environment variables are consistent
- Entry points are valid
- README instructions match the project
- No conflicting technology has been introduced