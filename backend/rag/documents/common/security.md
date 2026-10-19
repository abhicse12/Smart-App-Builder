# Security Guidelines

## Purpose

These guidelines define common security practices for generated applications.

They are technology-independent and should be followed by all supported backend technologies such as:

- Node.js + Express
- Python + FastAPI
- Java + Spring Boot
- MERN

Framework-specific implementation details should come from the corresponding technology knowledge file.

---

## 1. Authentication

Authentication verifies the identity of a user.

Protected resources must require authentication.

Example:

GET /api/projects

The backend should identify the authenticated user before returning private projects.

Authentication tokens or sessions must be handled securely.

Never trust a user identity supplied only through request body or query parameters.

---

## 2. Authorization

Authorization determines whether an authenticated user is allowed to perform an operation.

Always verify resource ownership.

Example:

User A requests:

DELETE /api/projects/project123

The backend must verify that `project123` belongs to User A before deleting it.

Never assume that authentication automatically gives access to every resource.

---

## 3. Password Security

Never store passwords as plain text.

Passwords must be hashed using a strong password hashing algorithm.

Examples include:

- bcrypt
- Argon2

Never return password hashes in API responses.

Never log user passwords.

---

## 4. Secrets and Environment Variables

Never hardcode sensitive credentials in source code.

Sensitive values include:

- JWT secrets
- Database passwords
- API keys
- OAuth secrets
- Cloud credentials
- Encryption keys

Use environment variables.

Example:

JWT_SECRET=your-secret
DATABASE_URL=your-database-url
API_KEY=your-api-key

Provide:

.env.example

Do not commit the actual `.env` file to version control.

---

## 5. Frontend Secret Protection

Never put server-side secrets inside frontend code.

Frontend code is visible to users.

Bad:

const API_KEY = "secret-api-key";

Prefer:

Frontend → Backend API → External Service

The backend should keep private credentials.

---

## 6. Input Validation

Never trust client input.

Validate:

- Request body
- Query parameters
- URL parameters
- File uploads
- User-generated content

Check:

- Required fields
- Data types
- String length
- Numeric ranges
- Allowed values
- File types
- File sizes

Reject invalid input before processing it.

---

## 7. Injection Prevention

Never directly construct database queries, shell commands, or other executable expressions from untrusted input.

Use framework-supported mechanisms such as:

- Parameterized queries
- Database query builders
- ORM/ODM APIs
- Validation libraries

Avoid unsafe string concatenation when building queries or commands.

---

## 8. XSS Protection

User-generated content should not be inserted into HTML without appropriate escaping or sanitization.

Avoid blindly rendering raw HTML supplied by users.

Frontend applications should safely handle:

- User names
- Comments
- Messages
- Descriptions
- Search results
- Uploaded content

---

## 9. CORS

Configure CORS carefully.

Do not allow every origin in production unless there is a specific reason.

Prefer explicitly configured trusted frontend origins.

Example:

FRONTEND_URL=https://example.com

The backend should allow requests from configured trusted origins.

---

## 10. Cookies

When authentication uses cookies:

- Prefer HttpOnly cookies for authentication tokens.
- Use Secure cookies in HTTPS production environments.
- Configure SameSite appropriately.
- Do not expose authentication cookies to frontend JavaScript unnecessarily.

Example concept:

HttpOnly
Secure
SameSite=Lax

or another appropriate SameSite policy depending on the application architecture.

Cookie-based authentication should also consider CSRF protection when required.

---

## 11. JWT Security

When JWT authentication is used:

- Keep the signing secret private.
- Use an environment variable for the secret.
- Validate the token on protected routes.
- Reject invalid or expired tokens.
- Keep token payloads minimal.
- Do not store sensitive information inside the token payload.

Example payload:

{
  "userId": "123"
}

Avoid storing:

{
  "password": "...",
  "creditCard": "..."
}

---

## 12. Rate Limiting

Apply rate limiting to APIs that are vulnerable to abuse.

Important targets include:

- Login
- Signup
- Password reset
- OTP verification
- Public APIs
- Expensive AI generation endpoints

Rate limits should help prevent:

- Brute-force attacks
- Excessive API usage
- Resource exhaustion
- Automated abuse

---

## 13. File Upload Security

If the application accepts file uploads:

- Validate file type.
- Validate file size.
- Generate safe filenames.
- Avoid trusting the original filename.
- Store uploads safely.
- Prevent executable files when unnecessary.
- Do not allow path traversal.

Example dangerous filename:

../../server.js

Never allow user-controlled paths to directly determine filesystem locations.

---

## 14. Path Traversal Protection

Never allow users to directly control filesystem paths.

Bad:

readFile("/app/" + userInput);

An attacker may attempt:

../../etc/passwd

Use safe path handling and validate allowed project/file paths.

For AI-generated projects, file paths should remain inside the intended project directory.

---

## 15. Command Execution Security

Never execute arbitrary shell commands provided directly by users.

Generated application commands should come from controlled server-side logic.

If command execution is required:

- Validate inputs.
- Restrict allowed commands.
- Avoid shell interpolation where possible.
- Use isolated containers for generated code.
- Apply resource limits.

---

## 16. Docker Isolation

AI-generated code should run inside isolated containers rather than directly on the host machine.

Containers should have:

- Restricted filesystem access
- Controlled networking
- Resource limits where appropriate
- Limited privileges
- No unnecessary host mounts

Never expose the host filesystem directly to generated applications.

---

## 17. AI-Generated Code Security

Generated code should be treated as untrusted code.

The system should:

1. Generate code.
2. Validate the generated files.
3. Run tests or validation.
4. Execute generated applications in isolated containers.
5. Detect runtime errors.
6. Apply controlled fixes.
7. Revalidate after fixes.

Never assume AI-generated code is automatically safe.

---

## 18. External API Security

External APIs may require credentials.

Use:

.env

and:

.env.example

Never hardcode API keys.

Example:

OPENAI_API_KEY=...
ASSEMBLYAI_API_KEY=...
STRIPE_SECRET_KEY=...

The generated application should provide clear instructions for configuring external services.

---

## 19. Demo-First Security

Generated demo applications should work without requiring production credentials.

For example:

- Use mock authentication when appropriate.
- Use local JSON data for demo persistence.
- Use mock payment responses.
- Use mock external API responses.

However, the generated code should maintain a clear separation so real services can be configured later.

Never create fake security that appears to protect real production data.

---

## 20. Error Messages

Do not expose sensitive implementation details.

Avoid returning:

- Stack traces
- Database connection strings
- Internal filesystem paths
- API keys
- Authentication secrets
- Detailed infrastructure errors

Prefer:

{
  "success": false,
  "message": "Something went wrong"
}

Detailed errors may be logged server-side.

---

## 21. Logging

Logs should help developers debug applications without exposing sensitive information.

Never log:

- Passwords
- Authentication tokens
- API keys
- Private credentials
- Sensitive personal information

Use structured and meaningful logs where possible.

---

## 22. Dependency Security

Use maintained dependencies.

Avoid unnecessary packages.

Generated projects should define dependencies explicitly in:

package.json

requirements.txt

pom.xml

or the appropriate package-management file.

Avoid installing packages that are not required by the generated application.

---

## 23. Production Security

Production applications should additionally consider:

- HTTPS
- Secure cookies
- CSRF protection where applicable
- Rate limiting
- Security headers
- Database access controls
- Secret management
- Monitoring
- Logging
- Dependency updates
- Backup and recovery

The exact implementation depends on the technology stack and deployment environment.

---

## 24. Security Rules for AI Agents

When generating an application:

1. Never hardcode secrets.
2. Never store passwords as plain text.
3. Validate all untrusted input.
4. Authenticate protected requests.
5. Authorize access to resources.
6. Prevent users from accessing another user's data.
7. Use safe database access methods.
8. Protect file operations against path traversal.
9. Do not execute arbitrary user-provided commands.
10. Run generated code in isolated environments.
11. Keep external credentials in environment variables.
12. Do not expose sensitive information in API responses.
13. Apply rate limiting to sensitive or expensive endpoints.
14. Revalidate code after AI-generated fixes.

---

## 25. Technology Independence

These security principles are common across technologies.

Technology-specific implementation should come from:

- Node.js + Express → `backend/node-express.md`
- Python + FastAPI → `backend/python-fastapi.md`
- Java + Spring Boot → `backend/java-springboot.md`
- MERN → `backend/mern.md`

Do not put framework-specific syntax in this file.

The Architect Agent should use these security rules when designing the application.

The Coder Agent should implement them using the selected technology's recommended patterns.