# Authentication Architecture

Authentication should only be introduced when the application requires user accounts, login, registration, authorization, or protected resources.

A typical JWT authentication architecture can contain:

- User model
- authentication controller
- authentication routes
- authentication middleware
- login page
- registration page
- centralized token handling

If passwords are stored, they should be securely hashed using a password hashing library.

If JWT authentication is used, the backend requires the jsonwebtoken dependency.

Protected frontend routes should correspond to actual authentication state and backend authorization behavior.

Do not create authentication files when the application does not require authentication.