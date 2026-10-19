# Java + Spring Boot Backend Guidelines

## Purpose

This document contains Java and Spring Boot-specific implementation knowledge for generating backend applications.

Use this document when the selected backend technology is:

- Java
- Spring Boot
- Java + Spring Boot

Common concepts such as API design, authentication, security, and Docker should be retrieved from the common knowledge documents.

---

## 1. Project Structure

Prefer a clean Spring Boot structure.

Example:

src/
└── main/
    ├── java/
    │   └── com/example/app/
    │       ├── controller/
    │       ├── service/
    │       ├── repository/
    │       ├── model/
    │       ├── dto/
    │       ├── config/
    │       ├── security/
    │       └── Application.java
    │
    └── resources/
        ├── application.properties
        └── application.yml

Root files:

pom.xml
Dockerfile
.env.example
README.md

For small applications, a simpler structure is acceptable.

Do not create unnecessary layers for very small applications.

---

## 2. Spring Boot Application

Basic Spring Boot application:

```java
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

The main application class should normally be located in the root package so component scanning works correctly.
3. Maven Configuration
Spring Boot applications commonly use Maven.
Example dependencies:
<dependencies>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>

</dependencies>

Add dependencies only when required.
Common dependencies include:
- spring-boot-starter-web
- spring-boot-starter-validation
- spring-boot-starter-data-jpa
- spring-boot-starter-security
- PostgreSQL driver
- MySQL driver
- H2 database
Use versions compatible with the selected Spring Boot version.
4. REST Controller
Use @RestController for REST APIs.
Example:
@RestController
@RequestMapping("/api/users")
public class UserController {

    @GetMapping
    public ResponseEntity<?> getUsers() {
        return ResponseEntity.ok(
            Map.of(
                "success", true,
                "data", List.of()
            )
        );
    }
}

Controllers should primarily handle HTTP-level concerns.
Avoid putting large business logic directly inside controllers.
5. HTTP Methods
Use appropriate Spring annotations.
GET:
@GetMapping
public ResponseEntity<?> getUsers() {
    // ...
}

POST:
@PostMapping
public ResponseEntity<?> createUser(
    @RequestBody UserRequest request
) {
    // ...
}

PUT:
@PutMapping("/{id}")
public ResponseEntity<?> updateUser(
    @PathVariable Long id
) {
    // ...
}

PATCH:
@PatchMapping("/{id}")
public ResponseEntity<?> patchUser(
    @PathVariable Long id
) {
    // ...
}

DELETE:
@DeleteMapping("/{id}")
public ResponseEntity<?> deleteUser(
    @PathVariable Long id
) {
    // ...
}

Follow the common API design guidelines.
6. Path Variables
Example request:
GET /api/products/123

Spring Boot:
@GetMapping("/{id}")
public ResponseEntity<?> getProduct(
    @PathVariable Long id
) {
    // ...
}

Validate the identifier when required.
7. Query Parameters
Example:
GET /api/products?search=laptop

Spring Boot:
@GetMapping
public ResponseEntity<?> getProducts(
    @RequestParam(required = false)
    String search
) {
    // ...
}

Query parameters can be used for:
- Search
- Filtering
- Sorting
- Pagination
8. Request Body
Use @RequestBody for JSON request data.
Example:
@PostMapping
public ResponseEntity<?> createUser(
    @RequestBody UserRequest request
) {
    // ...
}

Use DTO classes instead of directly exposing database entities when appropriate.
9. DTOs
DTO means Data Transfer Object.
Example:
public class UserRequest {

    private String name;

    private String email;

    // getters and setters
}

DTOs define the data expected by the API.
They help separate API contracts from database entities.
10. Bean Validation
Use Jakarta Bean Validation for request validation.
Example:
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public class UserRequest {

    @NotBlank
    private String name;

    @NotBlank
    @Email
    private String email;
}

Controller:
@PostMapping
public ResponseEntity<?> createUser(
    @Valid @RequestBody UserRequest request
) {
    // ...
}

Validate untrusted input before processing it.
11. Service Layer
Use @Service for business logic.
Example:
@Service
public class UserService {

    public List<User> getUsers() {
        // business logic
        return List.of();
    }
}

Controller:
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(
        UserService userService
    ) {
        this.userService = userService;
    }
}

Keep business logic out of controllers when the application has meaningful complexity.
12. Repository Layer
Spring Data JPA provides repository abstractions.
Example:
public interface UserRepository
    extends JpaRepository<User, Long> {
}

Use repositories for database access.
Avoid putting business logic inside repositories.
13. Entity
Example:
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(
        strategy = GenerationType.IDENTITY
    )
    private Long id;

    private String name;

    private String email;
}

Use entities for database persistence.
Avoid exposing entities directly when a DTO provides a safer API contract.
14. Database Configuration
If a database is required, configure it through environment variables.
Example:
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DATABASE_USERNAME}
spring.datasource.password=${DATABASE_PASSWORD}

Never hardcode production database credentials.
15. Demo-First Persistence
Generated Spring Boot applications should preferably work without external database credentials.
For simple demo applications, use H2 or another local persistence mechanism.
Example:
<dependency>
    <groupId>com.h2database</groupId>
    <artifactId>h2</artifactId>
    <scope>runtime</scope>
</dependency>

H2 can provide a lightweight local database for demonstrations.
For very simple applications, in-memory Java collections or local file persistence may also be used when appropriate.
The generated application should remain runnable without requiring an external production database unless explicitly requested.
16. PostgreSQL / MySQL
If a production-style SQL database is explicitly required, use the appropriate JDBC driver.
Examples:
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>

or:
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

Database credentials must come from environment variables.
17. Exception Handling
Spring Boot supports centralized exception handling using @ControllerAdvice.
Example:
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(
        ResourceNotFoundException.class
    )
    public ResponseEntity<?> handleNotFound(
        ResourceNotFoundException exception
    ) {

        return ResponseEntity
            .status(HttpStatus.NOT_FOUND)
            .body(
                Map.of(
                    "success", false,
                    "message",
                    "Resource not found"
                )
            );
    }
}

Do not expose stack traces or sensitive implementation details.
18. HTTP Status Codes
Use appropriate Spring HTTP status codes.
Example:
return ResponseEntity
    .status(HttpStatus.CREATED)
    .body(response);

Common codes:
OK
CREATED
NO_CONTENT
BAD_REQUEST
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
UNPROCESSABLE_ENTITY
INTERNAL_SERVER_ERROR

19. Response Structure
Use a consistent response structure.
Example:
return ResponseEntity.ok(
    Map.of(
        "success", true,
        "message", "User fetched successfully",
        "data", user
    )
);

Error:
return ResponseEntity
    .badRequest()
    .body(
        Map.of(
            "success", false,
            "message", "Invalid request"
        )
    );

The exact response structure may vary by project, but it should remain consistent.
20. CORS
For a separate frontend:
@Configuration
public class CorsConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {

        return new WebMvcConfigurer() {

            @Override
            public void addCorsMappings(
                CorsRegistry registry
            ) {

                registry
                    .addMapping("/**")
                    .allowedOrigins(
                        "http://localhost:5173"
                    )
                    .allowedMethods(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE"
                    )
                    .allowCredentials(true);
            }
        };
    }
}

Production applications should configure trusted origins instead of blindly allowing every origin.
21. Authentication with Spring Security
When authentication is required, Spring Security can be used.
Typical dependency:
<dependency>
    <groupId>
        org.springframework.boot
    </groupId>
    <artifactId>
        spring-boot-starter-security
    </artifactId>
</dependency>

Use Spring Security for:
- Authentication
- Authorization
- Password handling
- Protected endpoints
- Security configuration
The exact authentication mechanism depends on the application requirements.
22. Password Hashing
Never store plain-text passwords.
Spring Security provides password encoders.
Example:
@Bean
public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
}

Hash passwords before storing them:
String encodedPassword =
    passwordEncoder.encode(password);

Verify passwords using the configured password encoder.
Never return password hashes in API responses.
23. JWT Authentication
If JWT authentication is required, use a suitable JWT library and Spring Security integration.
Typical flow:
Login
  ↓
Validate credentials
  ↓
Generate JWT
  ↓
Return/set token
  ↓
Client sends token
  ↓
Security filter validates token
  ↓
Protected endpoint

Keep JWT signing secrets outside source code.
Use environment variables or a secure secret-management mechanism.
Do not place sensitive information inside JWT payloads.
24. Cookie-Based Authentication
If authentication uses cookies, configure secure cookie attributes.
Important attributes include:
HttpOnly
Secure
SameSite

Production deployments using HTTPS should use secure cookies.
Cookie-based authentication should consider CSRF protection where applicable.
25. Authorization
Use Spring Security authorization mechanisms to protect resources.
Example concept:
.requestMatchers(
    "/api/admin/**"
)
.hasRole("ADMIN")

Authentication verifies the identity.
Authorization verifies whether the user has permission.
Resource ownership must still be checked in application logic when required.
26. File Upload
Spring Boot can handle multipart file uploads.
Example:
@PostMapping("/upload")
public ResponseEntity<?> upload(
    @RequestParam("file")
    MultipartFile file
) {
    // validate and process file
    return ResponseEntity.ok(
        Map.of(
            "success", true
        )
    );
}

Validate:
- File type
- File size
- Filename
- Storage location
Never blindly trust uploaded files.
27. Configuration
Use:
application.properties

or:
application.yml

for application configuration.
Example:
server.port=${PORT:8080}

Environment variables should be used for secrets and deployment-specific configuration.
28. Health Endpoint
Provide a health endpoint for simple generated applications.
Example:
@GetMapping("/health")
public ResponseEntity<?> health() {

    return ResponseEntity.ok(
        Map.of(
            "success", true,
            "status", "healthy"
        )
    );
}

For larger applications, Spring Boot Actuator may be used.
29. API Documentation
Spring Boot applications can use OpenAPI/Swagger tooling when API documentation is required.
Document important endpoints in the README as well.
Typical documentation endpoint when configured:
/swagger-ui.html

or:
/swagger-ui/index.html

The exact URL depends on the OpenAPI configuration.
30. Node.js vs Python vs Java Rule
When generating a Spring Boot application:
Use:
Java
Spring Boot
Spring Web
Spring Data JPA
Spring Security
Maven

Do not generate Node.js-specific implementation such as:
express
package.json
npm install
req
res
node_modules

Do not generate Python/FastAPI-specific implementation such as:
FastAPI
uvicorn
requirements.txt
@app.get
Pydantic

The frontend may still use React/Vite or another technology.
Only the backend implementation must follow the selected Java/Spring Boot stack.
31. Docker
A basic Spring Boot Dockerfile can use:
FROM eclipse-temurin:21-jre

WORKDIR /app

COPY target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]

The Java version should match the generated application's requirements.
The project must be built before running this image.
For Maven projects:
mvn clean package

Then:
docker build -t spring-app .

32. Generated Backend Requirements
When generating a Java + Spring Boot application:
1. Create a valid Maven project.
2. Create pom.xml.
3. Create the Spring Boot main application class.
4. Configure required dependencies.
5. Create REST controllers.
6. Use DTOs for API request/response models where appropriate.
7. Validate incoming data.
8. Use services for meaningful business logic.
9. Use repositories for database access.
10. Implement authentication when required.
11. Implement authorization for protected resources.
12. Use environment variables for secrets.
13. Prefer H2/local persistence for demo-first applications.
14. Provide .env.example or configuration documentation.
15. Provide README setup instructions.
16. Ensure frontend API calls match backend endpoints.
17. Ensure the application starts successfully.
18. Ensure the project can run inside Docker when Docker execution is required.
33. Technology Selection Rule
Use this document only when the requested backend uses Java/Spring Boot.
Examples:
"Build a Java backend"
→ Use Java + Spring Boot if Spring Boot is the selected framework.
"Build a Spring Boot API"
→ Use Java + Spring Boot knowledge.
"Build a Node.js Express backend"
→ Do not use Spring Boot-specific implementation knowledge.
"Build a Python FastAPI backend"
→ Do not use Spring Boot-specific implementation knowledge.
The retrieval system should prefer technology-specific knowledge matching the selected backend technology.

### Ab hamara backend knowledge layer

```text
backend/
├── node-express.md
├── python-fastapi.md
├── java-springboot.md
└── mern.md