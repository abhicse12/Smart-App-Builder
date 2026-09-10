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
You MUST ONLY modify files that are required to fix the reported validation errors.

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
VALIDATION ERRORS
==================================================

${errors.map((error, index) => `${index + 1}. ${error}`).join("\n")}

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
STRICT FIXING RULES
==================================================

1. Fix EVERY reported validation error.

2. Do NOT change unrelated files.

3. Do NOT regenerate the complete project.

4. Return ONLY files that were modified.

5. Preserve the existing project architecture.

6. Preserve existing functionality whenever possible.

7. Do NOT create duplicate files.

8. Do NOT rename files unless absolutely required to fix an error.

9. Every import must point to an existing file.

10. Every imported controller function must actually be
    exported by that controller.

11. Every route must match its controller.

12. Every controller must match its model/service.

==================================================
BILLING RULES
==================================================

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

NEVER use:

- hoursWorked
- hourlyRate
- hourlyRatePaidToNurse
- hourlyRateChargedToPatient

Remove or replace hourly billing logic wherever it causes
the reported validation error.

Billing calculations MUST happen on the backend.

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

then those exact functions must exist in the controller.

Do NOT rename the route functions unless necessary.

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