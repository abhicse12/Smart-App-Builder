# Static Web Architecture Rules

These rules apply when the selected technology is:

- HTML
- CSS
- JavaScript
- Static Web

## 1. Architecture

Generate a frontend-only static web application.

Use:

- HTML
- CSS
- Vanilla JavaScript

Do not use:

- React
- React Router
- JSX
- TSX
- Vite
- Node.js
- Express
- MongoDB
- Backend server
- Server-side framework

unless the user explicitly requests a different architecture.

---

## 2. Recommended Project Structure

Prefer:

```text
project/
├── index.html
├── style.css
├── script.js
├── README.md
└── .gitignore

Additional files may be created when required by the application.
Examples:
assets/
images/
pages/
components/

Do not create unnecessary folders or configuration files.
3. HTML
Use semantic HTML where appropriate.
Examples:
<header>
<nav>
<main>
<section>
<article>
<footer>

Keep the HTML structure clear and accessible.
Use meaningful:
- IDs
- Classes
- Labels
- Button text
- Form fields
4. CSS
Keep styling in CSS files.
Do not put large amounts of CSS directly inside HTML unless there is a specific reason.
Use:
- Responsive layouts
- Flexbox
- CSS Grid
- Media queries
- Reusable classes
- CSS variables when useful
The design should work on:
- Desktop
- Tablet
- Mobile
5. JavaScript
Use vanilla JavaScript.
JavaScript should handle:
- DOM manipulation
- Event listeners
- Form interactions
- UI state
- Client-side validation
- Local storage
- Mock data
- API calls when explicitly required
Use modular functions and avoid unnecessary global variables.
6. Mock Data
For applications that require backend-like functionality but are selected as static web applications, use mock data when possible.
Possible approaches:
const products = [
  {
    id: 1,
    name: "Product 1",
    price: 499
  }
];

or:
data/
└── data.json

Use localStorage when persistent browser-side demo data is useful.
7. API Usage
A static project must not assume that a backend exists unless the user explicitly requests an external API.
If an API is required:
- Use fetch()
- Keep the API URL configurable
- Handle loading and error states
- Do not hardcode API secrets
Never expose private API keys in frontend JavaScript.
8. Authentication
For a static demo application, authentication should be implemented as a frontend/demo flow.
Possible implementation:
localStorage
sessionStorage
mock user data

Do not create a Node.js or database-based authentication system unless the selected stack explicitly includes a backend.
Clearly treat demo authentication as non-production authentication.
9. Forms
Forms should include:
- Appropriate labels
- Input validation
- Required fields where necessary
- User-friendly error messages
- Success feedback
Prevent invalid form submissions where appropriate.
10. Responsive Design
The application must be responsive.
Check common screen sizes:
Mobile
Tablet
Desktop

Avoid fixed layouts that break on smaller screens.
Use responsive CSS rather than JavaScript for normal layout adaptation.
11. External Libraries
Do not introduce unnecessary libraries.
For simple static applications, prefer browser-native APIs.
If an external library is required by the user's requirements, use it through a reliable CDN or the mechanism appropriate for the generated project.
Do not create a package.json unless the project explicitly requires a package manager or build tooling.
12. Runtime
The generated static project should run directly through a static web server.
It should not require:
npm install
npm run build
npm run dev

unless the user explicitly requested a build-based static architecture.
The standard project should work with:
index.html
style.css
script.js

13. File Consistency
Verify:
- index.html references the correct CSS file
- index.html references the correct JavaScript file
- Image paths are valid
- JavaScript selectors match HTML elements
- CSS selectors match HTML classes/IDs
- No unused or missing files are referenced
Example:
<link rel="stylesheet" href="style.css">
<script src="script.js"></script>

14. Final Validation
Before completing the architecture, verify:
- No React or JSX was introduced
- No backend was introduced
- No unnecessary package configuration exists
- HTML references valid files
- CSS references valid assets
- JavaScript selectors are valid
- Responsive layout is implemented
- Forms and interactions work
- Mock data works without external services
- The project can run as a static website