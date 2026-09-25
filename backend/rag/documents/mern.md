# MERN Applications

Use the MERN architecture when MongoDB, Express, React, and Node.js are selected or explicitly requested.

The application should normally contain:

- backend/
- frontend/

Backend:

- backend/server.js
- backend/app.js
- backend/package.json
- backend/config/db.js when MongoDB is used
- backend/models/
- backend/controllers/
- backend/routes/
- backend/middleware/ when required

Frontend:

- frontend/package.json
- frontend/index.html
- frontend/vite.config.js
- frontend/src/main.jsx
- frontend/src/App.jsx
- frontend/src/components/
- frontend/src/pages/
- frontend/src/services/

Frontend API communication should use a centralized API service.

Backend APIs should be represented by corresponding routes and controllers.

Database models should define canonical field names that are used consistently throughout the application.