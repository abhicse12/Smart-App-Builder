// Generation pipeline for Python full-stack projects (FastAPI + React).
// Returns the same shape as services/generationService.js, so the
// controller treats it like any other project.

import generateWithAI from "../../aiService.js";
import retrieveRelevantKnowledge from "../../retrievalService.js";
import validateProject from "../../validatorService.js";
import fixProject from "../../fixerService.js";
import runProject from "../../runnerService.js";
import generateProjectFiles from "../../fileGenerationService.js";
import { summarizeExports } from "../../validators/moduleExportsValidator.js";
import { summarizeConsoleModules } from "../../consoleProject.js";
import { PROJECT_RULES } from "./rules.js";
import {
  TEMPLATE_FILES,
  isAiWritablePath,
  keepAiWritableFiles,
} from "./templates.js";
import { extractFastApiEndpoints } from "./validators.js";
import runPythonAuthSmokeTest from "./authSmokeTest.js";

const BATCH_SIZE = 4;
const MAX_FIX_ATTEMPTS = 3;
const MAX_RUNTIME_FIX_ATTEMPTS = 3;

const PROJECT_TECH_STACK = [
  "Python",
  "FastAPI",
  "React",
  "Vite",
  "Tailwind CSS",
  "JSON storage",
];

const TEMPLATE_PATHS = new Set(TEMPLATE_FILES.map((file) => file.path));

// Backend first, so frontend batches see the real routes; App.jsx last
const fileOrder = ({ path }) => {
  if (path.startsWith("backend/data/")) return 0;
  if (path.startsWith("backend/app/schemas/")) return 1;
  if (path.startsWith("backend/app/services/")) return 2;
  if (path.startsWith("backend/app/routers/")) return 3;
  if (path === "frontend/src/App.jsx") return 7;
  if (path.startsWith("frontend/src/pages/")) return 6;
  if (path.startsWith("frontend/")) return 5;
  return 8;
};

const normalizePlan = (files = []) => {
  const plan = new Map();

  for (const file of Array.isArray(files) ? files : []) {
    const filePath = String(file?.path || "").replace(/\\/g, "/");

    // Templates already exist; anything outside the layout is refused
    if (TEMPLATE_PATHS.has(filePath) || !isAiWritablePath(filePath)) {
      console.warn(`Python stack: removed from the plan: ${filePath}`);
      continue;
    }

    plan.set(filePath, { path: filePath, purpose: String(file?.purpose || "") });
  }

  // The project cannot work without these two
  if (!plan.has("frontend/src/App.jsx")) {
    plan.set("frontend/src/App.jsx", {
      path: "frontend/src/App.jsx",
      purpose: "The application routes (see the rules)",
    });
  }

  if (!plan.has("README.md")) {
    plan.set("README.md", {
      path: "README.md",
      purpose:
        "What the app does, features, API endpoints and how to run it (backend: pip install -r requirements.txt, uvicorn app.main:app --port 5001; frontend: npm install, npm run dev). Explain that data is stored in JSON files under backend/data and that this suits demos, not production traffic.",
    });
  }

  return [...plan.values()]
    .map((file, index) => ({ file, index }))
    .sort((a, b) => fileOrder(a.file) - fileOrder(b.file) || a.index - b.index)
    .map(({ file }) => file);
};

/* =========================================================
   ARCHITECT
========================================================= */

const retrieveKnowledge = async (prompt) => {
  try {
    const chunks = await retrieveRelevantKnowledge(
      `Application Requirements:\n${prompt}\n\nSelected Technology Stack:\nPython, FastAPI, React`,
      ["Python", "FastAPI", "React"],
      3
    );

    return chunks.map((chunk) => `Source: ${chunk.source}\n${chunk.content}`).join("\n\n");
  } catch (error) {
    // The rules are complete on their own; RAG only adds guidance
    console.warn("Python stack: RAG retrieval skipped:", error.message);
    return "";
  }
};

const createArchitecture = async (prompt) => {
  const knowledge = await retrieveKnowledge(prompt);

  const architecture = await generateWithAI(`
You are the Architect Agent of an AI application builder.

Design a Python full-stack application for these requirements:

"${prompt}"

${PROJECT_RULES}

${
  knowledge
    ? `==================================================
RETRIEVED KNOWLEDGE (general guidance; the rules above always win)
==================================================

${knowledge}
`
    : ""
}
==================================================
YOUR TASK
==================================================

Plan ONLY the files the features need:
- backend/app/routers/<resource>.py and backend/app/schemas/<resource>.py
- backend/app/services/<resource>.py when the logic is not trivial
- backend/data/<resource>.json for read-only catalog data with seed records
- frontend/src/App.jsx, frontend/src/pages/*.jsx, frontend/src/components/*.jsx
- README.md

Every file's "purpose" must name its classes, functions, routes and props,
so files generated in separate batches stay consistent.

List every feature endpoint in "apiContract" (do not list /api/auth).
Every frontend feature needs an endpoint, and every endpoint must be used.

Return ONLY valid JSON:

{
  "projectName": "string",
  "description": "string",
  "files": [
    { "path": "string", "purpose": "string" }
  ],
  "apiContract": [
    {
      "method": "GET",
      "path": "/api/tasks/{id}",
      "auth": true,
      "body": null,
      "response": { "task": "Task" },
      "description": "string"
    }
  ]
}

Do NOT include markdown or explanations.
`);

  return {
    projectName: architecture.projectName,
    description: architecture.description,
    apiContract: Array.isArray(architecture.apiContract)
      ? architecture.apiContract
      : [],
    files: normalizePlan(architecture.files),
  };
};

/* =========================================================
   CODER
========================================================= */

const generateBatch = async ({ architecture, batch, generatedFiles }) => {
  const endpoints = extractFastApiEndpoints(generatedFiles);

  const modules = [
    ...summarizeConsoleModules(
      generatedFiles.filter((file) => file.path.endsWith(".py")),
      "python"
    ),
    ...summarizeExports(generatedFiles),
  ];

  const result = await generateWithAI(`
You are the Coder Agent of an AI application builder.

Write complete source code for this Python full-stack application.

Project Name: ${architecture.projectName}

Description:
${architecture.description}

${PROJECT_RULES}

==================================================
API CONTRACT
==================================================

${JSON.stringify(architecture.apiContract, null, 2)}

==================================================
PROJECT FILES YOU AND OTHER BATCHES WRITE
==================================================

${architecture.files.map((file) => `- ${file.path}: ${file.purpose}`).join("\n")}

==================================================
BACKEND ROUTES ALREADY GENERATED (AUTHORITATIVE)
==================================================

${
  endpoints.length > 0
    ? endpoints.map((endpoint) => `${endpoint.method} ${endpoint.path}`).join("\n")
    : "None generated yet."
}

If these differ from the API contract, these win.

==================================================
MODULES ALREADY GENERATED (USE THESE EXACT NAMES)
==================================================

${modules.length > 0 ? modules.join("\n") : "None generated yet."}

==================================================
REQUESTED FILES
==================================================

${batch.map((file) => `Path: ${file.path}\nPurpose: ${file.purpose}`).join("\n\n")}

Generate ONLY the requested files, each one complete.

Return ONLY valid JSON:

{
  "files": [
    { "path": "file-path", "content": "complete source code" }
  ]
}

Do NOT include markdown, code fences or explanations.
`);

  if (!result || !Array.isArray(result.files)) {
    throw new Error("Invalid AI response: files array not found");
  }

  const requested = new Set(batch.map((file) => file.path));

  const files = result.files
    .map((file) => ({
      ...file,
      path: String(file?.path || "").replace(/\\/g, "/"),
    }))
    .filter(
      (file) => requested.has(file.path) && typeof file.content === "string"
    );

  const missing = [...requested].filter(
    (filePath) => !files.some((file) => file.path === filePath)
  );

  if (missing.length > 0) {
    console.warn("Python stack: files missing from the batch:", missing);
  }

  return files;
};

/* =========================================================
   FIXER
========================================================= */

const mergeFiles = (project, files) => {
  const fileMap = new Map(project.files.map((file) => [file.path, file]));

  for (const file of files) {
    if (file?.path && typeof file.content === "string") {
      fileMap.set(file.path.replace(/\\/g, "/"), file);
    }
  }

  project.files = [...fileMap.values()];
};

const runFixer = async (project, errors) => {
  const result = await fixProject({
    projectName: project.projectName,
    description: project.description,
    techStack: project.techStack,
    errors,
    files: project.files,
  });

  if (!result || !Array.isArray(result.files)) {
    throw new Error("Invalid Fixer Agent response");
  }

  mergeFiles(project, keepAiWritableFiles(result).files);
};

// Returns the final validation and how many attempts it took
const validateAndFix = async (project) => {
  let validation = validateProject(project);
  let attempts = 0;

  while (!validation.valid && attempts < MAX_FIX_ATTEMPTS) {
    attempts++;

    console.log(
      `Fixer Agent attempt ${attempts}/${MAX_FIX_ATTEMPTS}:`,
      validation.errors
    );

    try {
      await runFixer(project, validation.errors);
    } catch (error) {
      console.error("Fixer Agent failed:", error.message);
      break;
    }

    validation = validateProject(project);
  }

  return { validation, attempts };
};

/* =========================================================
   GENERATE APPLICATION
========================================================= */

const generatePythonApp = async (prompt, projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required before runtime validation");
  }

  const architecture = await createArchitecture(prompt);

  console.log("Python full-stack files planned:", architecture.files.length);

  const generatedFiles = [];

  for (let i = 0; i < architecture.files.length; i += BATCH_SIZE) {
    const batch = architecture.files.slice(i, i + BATCH_SIZE);

    console.log(
      `Generating batch ${Math.floor(i / BATCH_SIZE) + 1}:`,
      batch.map((file) => file.path)
    );

    generatedFiles.push(
      ...(await generateBatch({ architecture, batch, generatedFiles }))
    );
  }

  const project = {
    projectName: architecture.projectName,
    description: architecture.description,
    techStack: PROJECT_TECH_STACK,
    files: [...TEMPLATE_FILES.map((file) => ({ ...file })), ...generatedFiles],
  };

  let { validation, attempts: fixerAttempts } = await validateAndFix(project);

  if (!validation.valid) {
    console.warn("Python project validation failed:", validation.errors);

    return {
      ...project,
      validation,
      fixerAttempts,
      runtimeValidation: {
        attempted: false,
        success: false,
        skipped: true,
        reason: "Static validation failed",
      },
    };
  }

  let written = await generateProjectFiles(projectId, project.files);

  const runtimeValidation = {
    attempted: true,
    success: false,
    skipped: false,
    attempts: 0,
    result: null,
    error: null,
  };

  for (let attempt = 1; attempt <= MAX_RUNTIME_FIX_ATTEMPTS; attempt++) {
    runtimeValidation.attempts = attempt;

    console.log(`Runtime validation attempt ${attempt}/${MAX_RUNTIME_FIX_ATTEMPTS}`);

    try {
      const runtimeResult = await runProject(projectId);

      const authSmokeTest = await runPythonAuthSmokeTest({
        files: project.files,
        previewUrl: runtimeResult.frontend?.previewUrl,
        projectId,
      });

      runtimeValidation.authSmokeTest = authSmokeTest;

      if (authSmokeTest.skipped || !authSmokeTest.success) {
        throw new Error(
          `Authentication smoke test failed: ${authSmokeTest.error || authSmokeTest.reason}`
        );
      }

      console.log("✅ Auth test passed:", authSmokeTest.steps.join(", "));

      runtimeValidation.success = true;
      runtimeValidation.result = runtimeResult;
      runtimeValidation.error = null;
      break;
    } catch (error) {
      console.error("Runtime validation failed:", error.message.slice(0, 1000));

      runtimeValidation.success = false;
      runtimeValidation.error = error.message;

      if (attempt === MAX_RUNTIME_FIX_ATTEMPTS) {
        break;
      }

      let errorDetail;

      try {
        errorDetail = JSON.parse(error.message);
      } catch {
        errorDetail = { type: "RUNTIME_ERROR", message: error.message };
      }

      try {
        await runFixer(project, [errorDetail]);

        const fixed = await validateAndFix(project);

        validation = fixed.validation;

        if (!validation.valid) {
          runtimeValidation.error = validation.errors.join("\n");
          break;
        }

        written = await generateProjectFiles(projectId, project.files);
      } catch (fixError) {
        console.error("Runtime Fixer failed:", fixError.message);
        runtimeValidation.error = fixError.message;
        break;
      }
    }
  }

  return {
    ...project,
    validation,
    fixerAttempts,
    projectRoot: written.projectRoot,
    formattedFiles: written.formattedFiles,
    runtimeValidation,
  };
};

export default generatePythonApp;
