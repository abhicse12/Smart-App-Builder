import generateWithAI from "./aiService.js";
import retrieveRelevantKnowledge from "./retrievalService.js";
import loadArchitectureRules from "./architectureRulesService.js";

const createProjectArchitecture = async (
  prompt,
  techStack = []
) => {
  // ==================================================
  // SELECTED TECHNOLOGY STACK
  // ==================================================

   const selectedTechStack =
    Array.isArray(techStack) && techStack.length > 0
      ? techStack.join(", ")
      : "Not specified";
   const architectureRules =
  await loadArchitectureRules(techStack);
  // ==================================================
  // RAG RETRIEVAL
  // ==================================================

  const retrievalQuery = `
Application Requirements:
${prompt}

Selected Technology Stack:
${selectedTechStack}
`;

  console.log("\n🔎 Retrieving relevant knowledge...");

  const relevantKnowledge =
  await retrieveRelevantKnowledge(
    retrievalQuery,
    techStack,
    3
  );

  console.log(
    "Retrieved Knowledge:",
    relevantKnowledge.map((item) => ({
      source: item.source,
      score: item.score,
    }))
  );

  // Convert retrieved chunks into context for Architect Agent
  const knowledgeContext =
    relevantKnowledge.length > 0
      ? relevantKnowledge
          .map(
            (item, index) => `
--- Knowledge ${index + 1} ---
Source: ${item.source}
Relevance Score: ${item.score}

${item.content}
`
          )
          .join("\n")
      : "No relevant knowledge was retrieved.";

  // ==================================================
  // ARCHITECT PROMPT
  // ==================================================

  const architecturePrompt = `

You are the Architect Agent of an AI application builder.

Analyze the following user requirement:

"${prompt}"

==================================================
SELECTED TECHNOLOGY STACK
==================================================

The user selected the following technologies when creating the project:

${selectedTechStack}

THIS SELECTED TECHNOLOGY STACK IS A HARD CONSTRAINT.

You MUST respect the selected technology stack.

Do NOT introduce technologies, frameworks, libraries, databases,
or backend services that were not selected by the user unless
they are absolutely required by the selected technology itself.

## Architecture Rules

The following architecture rules are mandatory.

${architectureRules}

==================================================
RETRIEVED KNOWLEDGE FROM RAG
==================================================

The following knowledge was retrieved from the project's
architecture knowledge base.

Use this knowledge as architectural guidance.

${knowledgeContext}

IMPORTANT RAG RULES:

1. Use retrieved knowledge when it is relevant to the application.

2. Retrieved knowledge is guidance, not a replacement for the
   user's explicit requirements.

3. The explicitly selected technology stack has higher priority
   than retrieved knowledge.

4. Do NOT introduce a technology simply because it appears in
   the retrieved knowledge.

5. Do NOT use React/Vite/Node.js/Express/MongoDB when the user
   selected only HTML, CSS and JavaScript.

6. Do NOT introduce a backend unless the application actually
   requires backend functionality or the selected stack requires it.

7. The final architecture must satisfy the user's requirements
   and remain compatible with the selected technology stack.



==================================================
IMPORTANT TECHNOLOGY PRIORITY
==================================================

Priority order:

1. Explicitly selected technology stack
2. Explicit technology requested in the user's requirements
3. Relevant retrieved RAG knowledge
4. Application functionality requirements
5. General architecture defaults

The selected technology stack MUST NOT be silently replaced
with another framework.

If the user's requirements conflict with the selected stack,
prefer the explicitly selected stack unless the user clearly
requests a different technology.

## Feature Completeness Requirements

Every functional requirement explicitly requested by the user MUST be
represented completely in the architecture.

For each requested feature, identify the complete implementation path
across all required layers.

For CRUD functionality, ALL four operations must be supported when
requested:

- Create
- Read
- Update
- Delete

For each CRUD operation, the architecture must provide:

1. Frontend UI/action
2. Frontend API/service function
3. Backend API route
4. Backend controller/handler
5. Persistence implementation
6. Demo-mode implementation when demo mode is required
7. Success and error handling
8. Frontend state update after successful operation

For filtering, searching, sorting, pagination, authentication,
authorization, file upload, or any other explicitly requested feature,
the same principle applies: the feature must have a complete
implementation path from the user interface to the required backend
logic and persistence.

A feature is NOT considered complete if only one layer is implemented.

Examples:

- A Delete button without a DELETE API is incomplete.
- A DELETE API without a frontend action is incomplete.
- A backend route without its controller implementation is incomplete.
- A frontend API function that is never connected to the UI is incomplete.

Before producing the final architecture, verify that EVERY explicit
user requirement has a corresponding end-to-end implementation path.

Do not omit functionality merely because another feature is similar.

## Authentication Requirements

If the user requests login, signup, authentication, or user accounts,
the generated application MUST include a complete working authentication
flow.

The authentication system must work WITHOUT requiring an external
database in demo mode.

### Required Authentication Features

1. Signup UI
   - Name
   - Email
   - Password
   - Confirm password
   - Validation
   - Link to Login

2. Login UI
   - Email
   - Password
   - Validation
   - Link to Signup
   - Loading state
   - Error handling

3. Backend Authentication
   - POST signup endpoint
   - POST login endpoint
   - Authentication validation
   - Proper success/error responses

4. Demo-mode Storage
   - Store users in a local JSON file.
   - Example:
     backend/data/users.json
   - Signup must add the new user to this JSON file.
   - Login must read users from this JSON file and validate
     email and password against the stored user.

5. Password Security
   - Never store plaintext passwords when a hashing library is
     available in the selected backend technology.
   - Hash passwords before storing them.
   - Compare the supplied password with the stored hash during login.

6. Authentication State
   - After successful login, the frontend must know that the user
     is authenticated.
   - Protected pages/features must require authentication when
     authentication is part of the user's requirements.
   - Logout must clear the authentication state.

7. Frontend Integration
   - Login form must call the login API.
   - Signup form must call the signup API.
   - Authentication errors must be displayed to the user.
   - Successful login must redirect to the appropriate application
     page.

8. Demo Mode
   - The generated application must run without MongoDB,
     PostgreSQL, MySQL, or any external authentication service.
   - External database/authentication services may be documented
     separately, but they must NOT be required for the generated
     demo to work.

A feature is incomplete if the UI exists without the API, the API
exists without the UI, or the authentication state is not connected
to the application.

Authentication must be treated as an end-to-end feature.

Required flow:

Signup UI
→ Signup API
→ Auth Controller
→ JSON User Storage
→ Login UI
→ Login API
→ Credential Validation
→ Authentication State
→ Protected Application
→ Logout

==================================================
YOUR ROLE
==================================================

Your job is NOT to generate source code.

Your job is to create a COMPLETE, CONSISTENT, DEPLOYABLE and
RUNNABLE project blueprint.

The blueprint will be passed to a separate Coder Agent which
will generate the actual source code.

Return ONLY valid JSON.

Use exactly this structure:

{
  "projectName": "string",
  "description": "string",
  "techStack": ["string"],
  "files": [
    {
      "path": "string",
      "purpose": "string"
    }
  ]
}


Return ONLY valid JSON.

Do NOT include markdown.

Do NOT include explanations outside JSON.

`;

  // ==================================================
  // GENERATE ARCHITECTURE
  // ==================================================

  const result = await generateWithAI(
    architecturePrompt
  );

  return result;
};

export default createProjectArchitecture;