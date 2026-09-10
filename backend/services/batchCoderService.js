import generateWithAI from "./aiService.js";

const generateBatchCode = async ({
  projectName,
  description,
  techStack,
  files,
  allFiles,
}) => {
  const batchPrompt = `
You are the Coder Agent of an AI application builder.

Project Name:
${projectName}

Project Description:
${description}

Technology Stack:
${techStack.join(", ")}

Generate complete source code ONLY for the requested files.

REQUESTED FILES:
${files
  .map(
    (file) => `
Path: ${file.path}
Purpose: ${file.purpose}
`
  )
  .join("\n")}

COMPLETE PROJECT STRUCTURE:
${allFiles.map((file) => `- ${file.path}`).join("\n")}

==================================================
STRICT RULES
==================================================

1. Generate EVERY requested file.

2. Do NOT generate files outside the requested batch.

3. Do NOT omit any requested file.

4. Every import must refer to an existing file in the complete project structure.

5. Every dependency used in code MUST exist in the appropriate package.json.

6. Routes and controllers MUST match exactly.

7. If a route imports a controller function, that exact function MUST be exported by the controller.

8. If a controller imports a model, that exact model MUST exist.

9. Do NOT invent function names that are not defined/exported.

10. Do NOT change the application's business logic.

11. Follow the architecture blueprint exactly.

==================================================
BILLING RULES
==================================================

This application uses DAILY billing.

NEVER convert the billing system to hourly billing.

Use these concepts:

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

Do NOT use:

- hoursWorked
- hourlyRate
- hourlyRatePaidToNurse
- hourlyRateChargedToPatient

unless they explicitly exist in the architecture blueprint.

Billing calculations MUST be performed on the backend.

==================================================
ROUTE / CONTROLLER CONSISTENCY
==================================================

Before returning the response, internally verify:

For every route:

route → controller function

For every controller:

controller → model/service

All names must match exactly.

For example:

If route contains:

router.post("/assignments", createAssignment);

then the controller MUST contain:

exports.createAssignment = ...

or the equivalent export format.

If a function does not exist, do NOT import it.

==================================================
FRONTEND / BACKEND CONSISTENCY
==================================================

Every frontend API request must correspond to an existing backend route.

Use the exact API paths defined by the backend architecture.

Do not invent API endpoints.

==================================================
PROJECT STRUCTURE
==================================================

Use ONLY:

backend/
frontend/

Do NOT create:

client/
server/

For frontend use:

React + Vite

Do NOT use:

react-scripts

==================================================
CODE QUALITY
==================================================

- Complete implementation
- No placeholder functions
- No TODO implementations
- Proper error handling
- Proper validation
- Clean formatting
- Consistent naming
- Production-style structure

==================================================
OUTPUT FORMAT
==================================================

Return ONLY valid JSON.

Exactly:

{
  "files": [
    {
      "path": "file-path",
      "content": "complete source code"
    }
  ]
}

The number of generated files MUST equal the number of requested files.

Do NOT include markdown.
Do NOT include code fences.
Do NOT include explanations outside JSON.
`;

  return await generateWithAI(batchPrompt);
};

export default generateBatchCode;