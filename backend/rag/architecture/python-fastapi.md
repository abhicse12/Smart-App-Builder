# Python FastAPI Architecture Rules

These rules apply when the selected technology stack includes:

- Python
- FastAPI
- Python + FastAPI

## 1. Architecture

Generate the backend using:

- Python
- FastAPI
- Pydantic for request/response validation

Recommended architecture:

```text
Client
 ↓
FastAPI Router
 ↓
Endpoint / Controller
 ↓
Service Layer
 ↓
Database / Mock Persistence

Do not generate Node.js, Express, Java, Spring Boot, or MongoDB-specific code unless explicitly required by the selected stack.
2. Recommended Project Structure
Use:
project/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── core/
│   │   └── dependencies/
│   ├── data/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
├── README.md
└── .gitignore

For small applications, the structure may be simplified when additional layers are unnecessary.
3. FastAPI Entry Point
The application must have a clear entry point.
Typical:
from fastapi import FastAPIapp = FastAPI(    title="Generated Application")@app.get("/")def root():    return {        "success": True,        "message": "API is running"    }


The actual application should expose the FastAPI instance expected by the runtime command.
4. Routers
Organize API endpoints using FastAPI routers when the application has multiple resources.
Example:
from fastapi import APIRouterrouter = APIRouter(    prefix="/api/products",    tags=["Products"])@router.get("/")def get_products():    return []


Register routers in main.py.
Example:
from fastapi import FastAPIfrom app.routers import productsapp = FastAPI()app.include_router(    products.router)


5. API Design
Prefer REST-style endpoints where appropriate.
Example:
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}

Route names and HTTP methods must match frontend API calls.
6. Pydantic Schemas
Use Pydantic models for request and response validation.
Example:
from pydantic import BaseModelclass ProductCreate(BaseModel):    name: str    price: float


Use schemas that match the actual application's requirements.
Do not create unnecessary schemas.
7. Service Layer
Business logic should be separated from API route definitions when the application is complex enough to benefit from it.
Example:
router
 ↓
service
 ↓
repository / database

Avoid putting large amounts of business logic directly inside route functions.
For small applications, a service layer may be omitted when it adds no meaningful separation.
8. Database
If database functionality is required, keep database configuration separate.
Possible structure:
backend/app/
├── core/
│   └── database.py
├── models/
└── schemas/

Database credentials must come from environment variables.
Never hardcode credentials.
9. Demo-First Full-Stack Mode
The generated application should remain runnable without external database credentials whenever possible.
If a real database is unavailable, use local mock/JSON persistence.
Example:
backend/data/
└── products.json

The application should still demonstrate:
- API routes
- CRUD operations
- Business logic
- Frontend/backend communication
- Error handling
External database configuration can be documented through:
.env.example
README.md

10. Environment Variables
Use environment variables for:
PORT
DATABASE_URL
SECRET_KEY
API keys
External service configuration

For Python applications, use an appropriate environment-loading mechanism.
Example:
DATABASE_URL=your_database_url
SECRET_KEY=your_secret

Never commit real credentials.
11. Authentication
When authentication is required, implement it in the FastAPI backend.
Typical flow:
React / Client
 ↓
POST /api/auth/login
 ↓
FastAPI
 ↓
Authentication
 ↓
Token / Session

Passwords must never be stored as plain text.
Use secure password hashing.
Authentication secrets must come from environment variables.
12. Authorization
Authentication determines who the user is.
Authorization determines what the user is allowed to access.
Protected endpoints must verify authorization before performing protected operations.
For user-owned resources, verify ownership before:
- Reading private data
- Updating data
- Deleting data
Never trust a client-provided user ID without server-side verification.
13. Error Handling
Use appropriate HTTP status codes and useful error responses.
FastAPI can use:
from fastapi import HTTPExceptionraise HTTPException(    status_code=404,    detail="Product not found")


Common status codes:
200 → Success
201 → Created
400 → Bad Request
401 → Unauthenticated
403 → Forbidden
404 → Not Found
500 → Server Error

Do not silently ignore application errors.
14. Frontend API Communication
If a React frontend is generated, keep API communication organized.
Recommended:
frontend/src/services/api.js

Example:
const API_BASE_URL = "/api";

export async function getProducts() {
  const response = await fetch(
    `${API_BASE_URL}/products`
  );

  if (!response.ok) {
    throw new Error(
      "Failed to fetch products"
    );
  }

  return response.json();
}

The frontend endpoint must match the FastAPI route.
15. CORS
If frontend and backend run on different origins during development, configure CORS explicitly.
Example:
from fastapi.middleware.cors import CORSMiddlewareapp.add_middleware(    CORSMiddleware,    allow_origins=[        "http://localhost:5173"    ],    allow_credentials=True,    allow_methods=["*"],    allow_headers=["*"],)


Do not allow unrestricted origins unnecessarily.
If authentication uses cookies, configure credentials consistently.
16. File Uploads
If file uploads are required, use FastAPI's file upload support.
Example:
from fastapi import UploadFile, File@app.post("/api/upload")async def upload_file(    file: UploadFile = File(...)):    ...


Validate:
- File type
- File size
- Filename
- Upload destination
Do not trust user-provided filenames.
If external storage is required, provide a mock/demo implementation when credentials are unavailable.
17. Frontend States
The React frontend must handle:
- Loading
- Success
- Error
- Empty data
- Authentication state where required
Do not assume API requests always succeed.
18. Dependencies
Use requirements.txt for Python dependencies.
Only include packages actually required by the generated application.
Example:
fastapi
uvicorn
pydantic

Add database, authentication, or other libraries only when they are actually used.
Do not add Node.js dependencies to a Python backend.
19. Runtime
The FastAPI application should be runnable using Uvicorn.
Typical development command:
uvicorn app.main:app --host 0.0.0.0 --port 8000

The actual command must match the generated project structure.
If main.py or the package structure differs, update the command accordingly.
20. Docker Compatibility
The generated FastAPI application must be compatible with the App Builder Docker runtime.
Ensure:
- Python runtime is available
- requirements.txt is valid
- Application entry point exists
- Dependencies install successfully
- Uvicorn command matches the project
- Port configuration matches the runtime
Do not introduce commands that depend on unavailable system packages unless required and documented.
21. Import Consistency
Verify every Python import.
For example:
from app.routers.products import router


must correspond to an actual file and exported object.
Avoid circular imports.
Keep package structure consistent.
22. README
The README must explain:
- Application purpose
- Python/FastAPI architecture
- Backend structure
- Installation
- Running the application
- Environment variables
- API endpoints
- Database configuration
- Demo/mock behavior
- Frontend/backend setup when applicable
Instructions must match the generated project.
23. Final Validation
Before completing the architecture, verify:
- Python is used for the backend
- FastAPI is used correctly
- Entry point exists
- Routers are registered
- Pydantic schemas match API data
- Imports resolve correctly
- Dependencies are declared
- API routes match frontend requests
- Error handling exists
- Authentication is secure when required
- Authorization checks ownership when required
- Environment variables are consistent
- Mock persistence works without external credentials when applicable
- Docker/runtime commands match the project
- No Node.js or Spring Boot architecture has been introduced