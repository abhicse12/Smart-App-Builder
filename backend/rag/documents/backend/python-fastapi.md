# Python + FastAPI Backend Guidelines

## Purpose

This document contains Python and FastAPI-specific implementation knowledge for generating backend applications.

Use this document when the selected backend technology is:

- Python
- FastAPI
- Python + FastAPI

Common concepts such as API design, authentication, security, and Docker should be retrieved from the common knowledge documents.

---

## 1. Project Structure

Prefer a clean FastAPI structure.

Example:

backend/
├── app/
│   ├── main.py
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   ├── middleware/
│   └── utils/
├── data/
├── requirements.txt
├── .env
├── .env.example
└── README.md

For small applications, a simpler structure is acceptable.

Do not create unnecessary abstraction for simple applications.

---

## 2. FastAPI Application Setup

Basic FastAPI application:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {
        "success": True,
        "message": "API is running"
    }

Run the application using Uvicorn:
uvicorn app.main:app --host 0.0.0.0 --port 8000

For development:
uvicorn app.main:app --reload

3. Requirements
Typical dependencies:
fastapi
uvicorn[standard]
python-dotenv

Add only the dependencies required by the generated application.
Examples:
pydantic
python-multipart
PyJWT
passlib
bcrypt

Use compatible versions when version pinning is required.
4. Environment Variables
Use environment variables for configuration and secrets.
Example:
PORT=8000
JWT_SECRET=your-secret
DATABASE_URL=your-database-url

Never hardcode secrets.
Provide:
.env.example

Example:
PORT=8000
JWT_SECRET=
DATABASE_URL=

5. API Routes
FastAPI provides decorators for defining API endpoints.
Example:
from fastapi import APIRouterrouter = APIRouter(prefix="/api/users")@router.get("/")def get_users():    return {        "success": True,        "data": []    }


Register the router:
from app.routes.user_routes import router as user_routerapp.include_router(user_router)


Keep routes focused on HTTP-level concerns.
6. HTTP Methods
Use appropriate FastAPI decorators.
@app.get("/api/users")def get_users():    pass


@app.post("/api/users")def create_user():    pass


@app.put("/api/users/{user_id}")def update_user(user_id: str):    pass


@app.patch("/api/users/{user_id}")def partially_update_user(user_id: str):    pass


@app.delete("/api/users/{user_id}")def delete_user(user_id: str):    pass


Follow the common API design guidelines.
7. Path Parameters
Example:
GET /api/products/123

FastAPI:
@app.get("/api/products/{product_id}")def get_product(product_id: str):    return {        "id": product_id    }


Validate the parameter when necessary.
8. Query Parameters
Example:
GET /api/products?search=laptop

FastAPI:
from typing import Optional@app.get("/api/products")def get_products(search: Optional[str] = None):    return {        "search": search    }


Query parameters can be used for:
- Search
- Filtering
- Sorting
- Pagination
9. Request Body
FastAPI commonly uses Pydantic models for request validation.
Example:
from pydantic import BaseModelclass UserCreate(BaseModel):    name: str    email: str    age: int


Endpoint:
@app.post("/api/users")def create_user(user: UserCreate):    return {        "success": True,        "data": user    }


FastAPI automatically validates the request body against the schema.
10. Pydantic Schemas
Use Pydantic models to define structured request and response data.
Example:
from pydantic import BaseModel, EmailStrclass UserCreate(BaseModel):    name: str    email: EmailStr    password: str


Schemas should represent the API contract.
Do not expose sensitive fields unnecessarily.
11. Response Models
Use response models when appropriate.
Example:
from pydantic import BaseModelclass UserResponse(BaseModel):    id: str    name: str    email: str


Endpoint:
@app.get(    "/api/users/{user_id}",    response_model=UserResponse)def get_user(user_id: str):    pass


Do not return password hashes or other sensitive fields.
12. Controllers and Services
For larger applications, separate responsibilities.
Recommended flow:
Request
   ↓
Router
   ↓
Controller
   ↓
Service
   ↓
Data Layer
   ↓
Response

For small applications, router and controller logic may be combined.
Avoid unnecessary abstraction.
13. Dependency Injection
FastAPI provides dependency injection using Depends.
Example:
from fastapi import Dependsdef get_current_user():    return {        "id": "123"    }@app.get("/api/profile")def profile(    user = Depends(get_current_user)):    return {        "success": True,        "user": user    }


Use dependencies for reusable logic such as:
- Authentication
- Database sessions
- Common validation
- Permission checks
14. Authentication
Protected endpoints can use FastAPI dependencies.
Example concept:
from fastapi import Depends, HTTPExceptiondef get_current_user():    user = None    if not user:        raise HTTPException(            status_code=401,            detail="Authentication required"        )    return user


Then:
@app.get("/api/profile")def profile(    user = Depends(get_current_user)):    return user


The exact authentication mechanism should depend on the generated application's requirements.
15. JWT Authentication
When JWT authentication is required, use an appropriate JWT library.
Example concept:
import jwttoken = jwt.encode(    {        "user_id": "123"    },    SECRET_KEY,    algorithm="HS256")


Verify tokens before accessing protected resources.
Keep the secret in an environment variable.
Do not put sensitive information inside JWT payloads.
16. Password Hashing
Never store plain-text passwords.
Use a suitable password hashing library such as bcrypt or Argon2.
Conceptual example:
import bcrypthashed_password = bcrypt.hashpw(    password.encode(),    bcrypt.gensalt())


Verify passwords using the corresponding verification mechanism.
Never return password hashes to the frontend.
17. Cookie-Based Authentication
If the application uses cookie-based authentication, FastAPI can set cookies using the response object.
Example:
from fastapi import Responseresponse.set_cookie(    key="token",    value=token,    httponly=True,    secure=False,    samesite="lax")


Production deployments using HTTPS should use:
secure=True

Configure cookie security according to the application architecture.
Consider CSRF protection where required.
18. CORS
For a separate frontend and backend:
from fastapi.middleware.cors import CORSMiddlewareapp.add_middleware(    CORSMiddleware,    allow_origins=[        "http://localhost:5173"    ],    allow_credentials=True,    allow_methods=["*"],    allow_headers=["*"],)


Production applications should configure trusted origins instead of blindly allowing every origin.
19. Error Handling
FastAPI uses HTTPException for common API errors.
Example:
from fastapi import HTTPExceptionraise HTTPException(    status_code=404,    detail="User not found")


For unexpected errors, avoid exposing sensitive implementation details.
20. Custom Exception Handling
FastAPI supports custom exception handlers.
Example:
from fastapi.responses import JSONResponse@app.exception_handler(Exception)async def general_exception_handler(    request,    exc):    return JSONResponse(        status_code=500,        content={            "success": False,            "message": "Internal server error"        }    )


Do not expose stack traces, secrets, or internal infrastructure information to clients.
21. Demo-First Persistence
Generated FastAPI applications should preferably work without external database credentials.
For demo applications, local JSON persistence can be used.
Example:
data/
├── users.json
├── products.json
└── projects.json

Python can read and write JSON using:
import json


Example:
with open(    "data/products.json",    "r") as file:    products = json.load(file)


This allows the generated project to run without requiring an external database.
22. MongoDB
If MongoDB is explicitly required, a Python MongoDB driver such as PyMongo can be used.
Example dependency:
pymongo

Connection configuration should come from:
MONGO_URI=your-mongodb-url

Never hardcode the MongoDB connection string.
23. SQL Databases
If a SQL database is required, use an appropriate Python database library or ORM.
Possible technologies include:
- SQLAlchemy
- SQLModel
- PostgreSQL drivers
- SQLite
For simple demo applications, SQLite can be useful because it does not require a separate database server.
24. File Uploads
FastAPI supports file uploads using UploadFile.
Example:
from fastapi import UploadFile, File@app.post("/api/upload")async def upload_file(    file: UploadFile = File(...)):    return {        "filename": file.filename    }


Validate:
- File type
- File size
- Filename
- Storage location
Do not trust the original filename.
25. Background Tasks
FastAPI provides BackgroundTasks for lightweight background operations.
Example:
from fastapi import BackgroundTasks@app.post("/api/tasks")def create_task(    background_tasks: BackgroundTasks):    background_tasks.add_task(        some_function    )    return {        "success": True    }


Do not use simple background tasks for workloads that require a dedicated job queue or durable processing.
26. API Documentation
FastAPI automatically provides API documentation.
Common endpoints:
/docs
/redoc

Generated projects should document important API behavior in the README as well.
27. Health Check
Provide a simple health endpoint.
Example:
@app.get("/health")def health():    return {        "success": True,        "status": "healthy"    }


This can be used by Docker, deployment platforms, or monitoring systems.
28. Static Files
FastAPI can serve static files when required.
Example:
from fastapi.staticfiles import StaticFilesapp.mount(    "/static",    StaticFiles(directory="static"),    name="static")


For production architectures where a separate frontend server exists, serving frontend assets from FastAPI may not be necessary.
29. Node.js vs FastAPI Rule
When generating a Python FastAPI application:
Use:
Python
FastAPI
Pydantic
Uvicorn
Python libraries

Do not generate Node.js-specific implementation such as:
express
req
res
package.json
npm install
node_modules

The frontend may still be React/Vite or another technology.
Only the backend implementation must follow the selected Python/FastAPI stack.
30. Docker
A basic FastAPI Dockerfile can use:
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

The Python version should match the generated application's requirements.
31. Generated Backend Requirements
When generating a Python FastAPI application:
1. Create a valid Python project structure.
2. Create requirements.txt.
3. Create the FastAPI application.
4. Configure required middleware.
5. Create API routes.
6. Use Pydantic schemas for request validation.
7. Use dependencies where appropriate.
8. Implement authentication when required.
9. Implement authorization for protected resources.
10. Use environment variables for secrets.
11. Prefer local/mock persistence for demo-first applications.
12. Provide .env.example.
13. Provide README setup instructions.
14. Ensure the application starts successfully.
15. Ensure frontend API calls match backend endpoints.
16. Ensure the project can run inside Docker when Docker execution is required.
32. Technology Selection Rule
Use this document only when the requested backend uses Python/FastAPI.
Examples:
"Build a Python backend"
→ Prefer Python/FastAPI if FastAPI is the selected framework.
"Build a FastAPI API"
→ Use Python + FastAPI knowledge.
"Build a Node.js Express backend"
→ Do not use FastAPI-specific implementation knowledge.
"Build a Spring Boot backend"
→ Do not use FastAPI-specific implementation knowledge.
The retrieval system should prefer technology-specific knowledge matching the selected backend technology.