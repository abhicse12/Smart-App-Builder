# Static HTML CSS JavaScript Applications

Use this architecture when the selected technology stack contains HTML, CSS, and JavaScript without a frontend framework such as React, Vue, Angular, or Next.js.

A basic static application normally contains:

- index.html
- style.css
- script.js
- README.md
- .gitignore

Do not introduce React, JSX, Vite, Node.js, Express, MongoDB, or a backend unless explicitly required.

HTML should contain the application structure and UI.

CSS should contain presentation and responsive styling.

JavaScript should contain application state, DOM manipulation, event handling, validation, and business logic required by the application.

Static applications should be runnable using a static HTTP server such as Nginx.

For simple browser applications such as Tic-Tac-Toe, Calculator, Todo List, Stopwatch, Quiz, or similar applications, prefer a simple static architecture.