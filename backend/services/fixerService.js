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

2. Fix errors systematically, one by one.

3. Before modifying a file, identify:
   - the exact error
   - the affected file
   - the root cause
   - the minimum required change

4. Prefer the smallest possible fix.

5. Do NOT regenerate the entire project.

6. Do NOT rewrite files that are unrelated to the reported errors.

7. If multiple errors affect the same file, combine the fixes
   into ONE corrected version of that file.

8. If one error depends on another file, modify both files only
   when required to restore consistency.

9. After making changes, mentally verify:
   - imports
   - exports
   - routes
   - controllers
   - API calls
   - component names
   - React routes
   - dependencies
   - environment variables
   - syntax
   - runtime behavior

10. Do NOT fix an error by removing functionality.

11. Do NOT replace working implementations with dummy code.

12. Do NOT comment out broken code instead of fixing it.

13. Do NOT silently ignore any reported error.

14. Do NOT create duplicate files.

15. Do NOT rename files unless absolutely necessary.

16. Every local import must resolve to an existing file.

17. Every imported function/component must actually be exported.

18. Every frontend API call must correspond to an appropriate
    backend route when a backend exists.

19. Every backend route must use an existing controller function.

20. Every controller must use the appropriate existing
    persistence/model/service layer.

21. Preserve the architecture defined by the Architect Agent.

22. Preserve existing functionality whenever possible.

23. Do NOT introduce unnecessary dependencies.

24. Do NOT modify package/configuration files unless the
    reported error actually requires the change.

25. If a reported error is already fixed by another modification,
    do not make an additional unnecessary change.

==================================================
ERROR PRIORITY
==================================================

When multiple errors are reported, use this priority:

1. Syntax / parse errors
2. Missing files
3. Broken imports
4. Missing exports
5. Dependency errors
6. Route/controller mismatches
7. Frontend route/navigation mismatches
8. API/frontend-backend mismatches
9. Runtime application errors
10. Feature completeness errors
11. Warnings

Fix the root cause first.

Do not blindly fix downstream errors that are caused by an
earlier root-cause error.

==================================================
FINAL SELF-CHECK
==================================================

Before returning the result, verify:

- Every reported error has been addressed.
- No unrelated functionality was removed.
- No duplicate files were created.
- Every modified file contains complete source code.
- Imports and exports are consistent.
- Routes and controllers are consistent.
- Frontend navigation and React routes are consistent.
- Dependencies are consistent with actual imports.
- The project architecture is preserved.

Only after this verification should the modified files
be returned.

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