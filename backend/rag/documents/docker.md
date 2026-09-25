# Docker Runtime Architecture

Generated applications may run inside an isolated Docker environment.

For Node.js backend applications:

- The server should use process.env.PORT.
- The default backend port should be 5001.
- The server should listen on 0.0.0.0.

For Vite frontend applications:

- The development server should listen on 0.0.0.0.
- The frontend port should be 5173.
- Frontend API requests should use /api.
- Vite should proxy /api to http://localhost:5001.

Static HTML/CSS/JavaScript applications do not require Node.js or Vite.

Static applications can be served using Nginx.

The generated architecture should match the capabilities of the selected project type.