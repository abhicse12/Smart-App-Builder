import generateWithAI from "./aiService.js";

const fixProject = async ({
  projectName,
  description,
  techStack,
  errors,
  files,
}) => {
  const fixerPrompt = `
You are the Fixer Agent of an AI application builder.

Your job is to repair an already generated project.

You MUST NOT regenerate the entire project.

You MUST ONLY modify files that are required to fix the reported error.

==================================================
PROJECT
==================================================

Project Name:
${projectName}

Description:
${description}

Technology Stack:
${techStack.join(", ")}

==================================================
REPORTED ERRORS
==================================================

${errors
  .map((error, index) => {
    const formattedError =
      typeof error === "string"
        ? error
        : JSON.stringify(error, null, 2);

    return `${index + 1}. ${formattedError}`;
  })
  .join("\n")}

==================================================
CURRENT PROJECT FILES
==================================================

${files
  .map(
    (file) => `
------------------------------
FILE: ${file.path}
------------------------------
${file.content}
`
  )
  .join("\n")}

==================================================
ERROR ANALYSIS
==================================================

The reported error may be:

1. STATIC VALIDATION ERROR
2. RUNTIME ERROR

If the error contains:

"type": "RUNTIME_ERROR"

then carefully analyze:

- service
- healthError
- dockerLogs

The Docker logs contain the actual runtime failure.

Use the Docker logs to determine the root cause.

Examples of runtime problems include:

- Cannot find module
- Failed to resolve import
- SyntaxError
- ReferenceError
- TypeError
- Missing export
- Missing file
- Incorrect import path
- Incorrect component name
- Backend startup failure
- Missing environment variable
- Invalid API route
- Port configuration problem
- React rendering error
- Vite startup error

Do NOT blindly change code.

Identify the actual root cause first.

==================================================
STRICT FIXING RULES
==================================================

1. Fix EVERY reported error.

2. Do NOT regenerate the entire project.

3. Do NOT change unrelated files.

4. Return ONLY files that were modified.

5. Preserve the existing project architecture.

6. Preserve existing functionality whenever possible.

7. Do NOT create duplicate files.

8. Do NOT rename files unless absolutely required.

9. Every import must point to an existing file.

10. Every imported function must actually be exported.

11. Every route must match its controller.

12. Every controller must match its model/service.

13. Do not remove working functionality just to make the
    application run.

14. Do not introduce unnecessary dependencies.

15. Do not modify dependency/configuration files unless
    the reported error actually requires it.

==================================================
INFRASTRUCTURE ERROR PROTECTION
==================================================

IMPORTANT:

Some runtime errors are NOT caused by project source code.

If the runtime error only indicates infrastructure or container
startup problems such as:

- connection refused
- wget: can't connect to remote host
- container is not running
- container stopped
- Docker daemon error
- Docker networking error
- health check failure
- container startup failure

AND the dockerLogs do NOT contain an actual application error
such as:

- SyntaxError
- ReferenceError
- TypeError
- Cannot find module
- Failed to resolve import
- Module not found
- Vite build error
- React compilation error
- Backend startup error

then DO NOT modify any project file.

In this situation, the project source code has not been proven
to be the cause of the failure.

Return exactly:

{
  "files": []
}

NEVER modify:

- vite.config.js
- vite.config.ts
- package.json
- Dockerfile
- docker-compose.yml
- source files

just because the container failed to respond or the health check
failed.

Only modify project files when the Docker logs provide a
specific application-level error with an identifiable root cause.
==================================================
DEPENDENCY AND CONFIGURATION PROTECTION
==================================================

Normally DO NOT modify:

- package.json
- package-lock.json
- npm-shrinkwrap.json
- yarn.lock
- pnpm-lock.yaml
- vite.config.js
- vite.config.ts
- tsconfig.json
- eslint.config.js
- .eslintrc
- tailwind.config.js
- postcss.config.js
- Dockerfile
- docker-compose.yml
- .env

If the runtime error can be fixed without changing these
files, do NOT modify them.

If a dependency/configuration change is absolutely required,
modify only the necessary file.

Preserve existing dependency versions whenever possible.

==================================================
BILLING RULES
==================================================

Only apply these rules if the project actually contains
billing functionality.

This application uses DAILY billing.

The billing system MUST use:

- numberOfDays
- nurseDailyRate
- patientDailyRate
- nurseAmount
- patientAmount
- companyMargin

Calculations:

Patient Amount =
numberOfDays × patientDailyRate

Nurse Amount =
numberOfDays × nurseDailyRate

Company Margin =
patientAmount - nurseAmount

NEVER introduce:

- hoursWorked
- hourlyRate
- hourlyRatePaidToNurse
- hourlyRateChargedToPatient

Billing calculations MUST happen on the backend.

Do NOT add billing logic to projects that do not require billing.

==================================================
ROUTE / CONTROLLER CONSISTENCY
==================================================

If a route contains:

router.post("/assignments", createAssignment);

then the controller MUST export:

createAssignment

If a route imports:

createAssignment
generateBill
getAssignments

then those exact functions must exist.

Do NOT rename route functions unless necessary.

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Exactly:

{
  "files": [
    {
      "path": "file-path",
      "content": "complete corrected source code"
    }
  ]
}

Only include modified files.

Do NOT include markdown.

Do NOT include code fences.

Do NOT include explanations outside JSON.
`;

  return await generateWithAI(fixerPrompt);
};

export default fixProject;