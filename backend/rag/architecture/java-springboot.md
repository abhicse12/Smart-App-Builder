# Java Spring Boot Architecture Rules

These rules apply when the selected technology stack includes:

- Java
- Spring Boot
- Java + Spring Boot

## 1. Architecture

Generate the backend using:

- Java
- Spring Boot
- Spring Web
- Appropriate Spring components for the application's requirements

Recommended architecture:

```text
Client
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Database / Mock Persistence

Do not generate Node.js, Express, Python, or FastAPI backend code unless explicitly required by the selected stack.
2. Recommended Project Structure
Use a standard Spring Boot structure:
project/
├── backend/
│   ├── pom.xml
│   └── src/
│       ├── main/
│       │   ├── java/
│       │   │   └── com/example/app/
│       │   │       ├── Application.java
│       │   │       ├── controller/
│       │   │       ├── service/
│       │   │       ├── repository/
│       │   │       ├── model/
│       │   │       ├── dto/
│       │   │       ├── config/
│       │   │       └── exception/
│       │   └── resources/
│       │       ├── application.properties
│       │       └── application.yml
│       └── test/
├── frontend/
├── .env.example
├── README.md
└── .gitignore

For small applications, unnecessary layers may be omitted.
3. Spring Boot Entry Point
The project must contain a valid Spring Boot application entry point.
Example:
package com.example.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(
            Application.class,
            args
        );
    }
}

The package name and file location must match the generated project.
4. REST Controllers
Use @RestController for REST APIs.
Example:
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @GetMapping
    public List<Product> getProducts() {
        return productService.getProducts();
    }
}

Controllers should handle HTTP-level concerns.
Avoid putting large amounts of business logic inside controllers.
5. API Design
Prefer REST-style endpoints.
Example:
GET    /api/products
GET    /api/products/{id}
POST   /api/products
PUT    /api/products/{id}
DELETE /api/products/{id}

Routes must match frontend API calls.
Use appropriate HTTP methods and status codes.
6. Service Layer
Business logic should be placed in services.
Example:
@Service
public class ProductService {

    public List<Product> getProducts() {
        // business logic
    }
}

Controllers should call services instead of containing the application's main business logic.
7. Repository Layer
When database persistence is required, use Spring Data repositories.
Example:
public interface ProductRepository
        extends JpaRepository<Product, Long> {
}

Repository responsibilities should focus on data access.
Do not put business logic inside repository classes.
8. Models / Entities
For relational database applications, use JPA entities when appropriate.
Example:
@Entity
public class Product {

    @Id
    @GeneratedValue
    private Long id;

    private String name;

    private Double price;
}

Entity fields should match the application's actual data requirements.
Do not create unnecessary fields.
9. DTOs
Use DTOs when request and response structures should be separated from database entities.
Example:
public class ProductRequest {

    private String name;

    private Double price;
}

Do not expose internal database structures unnecessarily.
10. Demo-First Full-Stack Mode
The generated application should remain runnable without external database credentials whenever possible.
If a real database is unavailable, use local in-memory or mock persistence.
Possible implementation:
List<Product>
Map<Long, Product>
JSON file

The application should still demonstrate:
- REST APIs
- CRUD operations
- Business logic
- Frontend/backend communication
- Error handling
External database configuration can be documented using:
.env.example
README.md

Do not make the generated demo unusable because external database credentials are unavailable.
11. Database Configuration
If a database is required, configuration must not contain hardcoded credentials.
Use Spring configuration properties.
Example:
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

The actual properties must match the selected database technology.
12. Environment Variables
Use environment variables for:
DATABASE_URL
DATABASE_USERNAME
DATABASE_PASSWORD
JWT_SECRET
API keys
External service configuration

Never commit real secrets.
Provide:
.env.example

when environment configuration is required.
13. Authentication
When authentication is required, implement authentication on the backend.
Typical flow:
Frontend
 ↓
POST /api/auth/login
 ↓
Spring Controller
 ↓
Authentication Service
 ↓
Authentication Provider
 ↓
Token / Session

Passwords must never be stored as plain text.
Use appropriate password hashing.
Authentication secrets must come from environment variables.
14. Authorization
Authentication determines the identity of the user.
Authorization determines what the user is allowed to do.
Protected endpoints must verify authorization.
For user-owned resources, verify ownership before:
- Reading private data
- Updating data
- Deleting data
Never trust client-provided ownership information.
15. Security Configuration
When Spring Security is required, configure it consistently with the application's authentication architecture.
Do not add complex security configuration unless authentication or authorization is actually required.
Avoid exposing protected endpoints publicly.
Never disable security checks simply to make an endpoint work.
16. Error Handling
Use consistent API error responses.
For example:
{
  "success": false,
  "message": "Product not found"
}

Use appropriate HTTP status codes:
200 → Success
201 → Created
400 → Bad Request
401 → Unauthenticated
403 → Forbidden
404 → Not Found
500 → Server Error

For larger applications, use centralized exception handling with Spring's exception-handling mechanisms.
17. Frontend API Communication
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

Frontend endpoints must exactly match Spring Boot endpoints.
18. CORS
If frontend and backend run on different origins during development, configure CORS appropriately.
Allow only required frontend origins.
Example concept:
http://localhost:5173

Do not use unrestricted origins unnecessarily.
If authentication uses cookies, configure credentials consistently.
19. File Uploads
If file uploads are required, use Spring's multipart support.
Example:
@PostMapping("/upload")
public ResponseEntity<?> upload(
    @RequestParam("file")
    MultipartFile file
) {
    // upload handling
}

Validate:
- File type
- File size
- Filename
- Storage destination
Do not trust user-provided filenames.
If external storage is required, provide a mock/demo implementation when credentials are unavailable.
20. Dependencies
Use Maven for dependency management.
The project should contain:
pom.xml

Only include dependencies actually used by the application.
Typical dependencies may include:
spring-boot-starter-web
spring-boot-starter-validation
spring-boot-starter-data-jpa
spring-boot-starter-security

Add dependencies only when the application requires them.
Do not add unnecessary Spring modules.
21. Validation
Use request validation where appropriate.
Example:
public class ProductRequest {

    @NotBlank
    private String name;

    @Positive
    private Double price;
}

Controller:
public ResponseEntity<?> createProduct(
    @Valid @RequestBody ProductRequest request
) {
    ...
}

Validate user-controlled input before processing it.
22. Runtime
The Spring Boot application must have a valid startup command.
Typical Maven command:
./mvnw spring-boot:run

or:
mvn spring-boot:run

The actual command must match the generated project.
The application should expose the expected backend port.
23. Docker Compatibility
The generated Spring Boot application must be compatible with the App Builder Docker runtime.
Ensure:
- Java runtime is available
- pom.xml is valid
- Dependencies install successfully
- Application entry point exists
- Startup command matches the project
- Port configuration is correct
Do not depend on unavailable system tools without documenting them.
24. Import and Package Consistency
Verify:
- Java package declarations match directory structure
- Imports reference existing classes
- Classes have the required annotations
- Components are discoverable by Spring Boot
- Controller paths are correct
- Service dependencies are correctly injected
Avoid circular dependencies between layers.
25. Frontend States
If a React frontend is generated, it must handle:
- Loading
- Success
- Error
- Empty data
- Authentication state where required
Do not assume every backend request succeeds.
26. README
The README must explain:
- Application purpose
- Java/Spring Boot architecture
- Project structure
- Maven setup
- Running the backend
- Environment variables
- API endpoints
- Database configuration
- Demo/mock behavior
- Frontend setup when applicable
Instructions must match the actual generated project.
27. Final Validation
Before completing the architecture, verify:
- Java is used for the backend
- Spring Boot is configured correctly
- Main application class exists
- Controllers are valid
- Services contain business logic
- Repositories are valid when required
- Models/entities match application requirements
- DTOs are valid when required
- Imports and packages are consistent
- Maven dependencies match actual code
- API routes match frontend requests
- Validation and error handling exist
- Authentication is secure when required
- Authorization checks ownership when required
- Environment variables are consistent
- Mock persistence works without external credentials when applicable
- Docker/runtime commands match the project
- No Node.js or FastAPI architecture has been introduced
