import createProjectArchitecture from "./architectService.js";
import generateBatchCode from "./batchCoderService.js";
import validateProject from "./validatorService.js";
import fixProject from "./fixerService.js";
import runProject from "./runnerService.js";
import generateProjectFiles from "./fileGenerationService.js";
import runAuthSmokeTest from "./authSmokeTest.js";
import { extractBackendEndpoints } from "./validators/apiContractValidator.js";
import { summarizeExports } from "./validators/moduleExportsValidator.js";
import {
  getConsoleLanguage,
  summarizeConsoleModules,
} from "./consoleProject.js";

const BATCH_SIZE = 4;

const MAX_FIX_ATTEMPTS = 3;

const MAX_RUNTIME_FIX_ATTEMPTS = 3;

// Backend files first, so frontend batches can be given the routes the
// backend really implements; inside the frontend, shared modules
// (services, context, hooks, components) come before the pages that
// import them, and App/main last. Order within each group is kept.
const FRONTEND_ORDER = [
  /\/(services|api|lib|utils|config)\//,
  /\/(context|contexts|store|hooks)\//,
  /\/components\//,
  /\/pages\//,
];

const fileOrder = (filePath = "") => {
  const normalized = String(filePath).replace(/\\/g, "/");

  if (normalized.startsWith("backend/")) return 0;

  if (normalized.startsWith("frontend/")) {
    if (/\/(App|main)\.(jsx?|tsx?)$/.test(normalized)) return 6;

    const group = FRONTEND_ORDER.findIndex((pattern) =>
      pattern.test(normalized)
    );

    // Config files (package.json, vite.config.js, index.css) first
    return group === -1 ? 1 : 2 + group;
  }

  return 7;
};

const orderFilesForGeneration = (files = []) =>
  files
    .map((file, index) => ({ file, index }))
    .sort(
      (a, b) =>
        fileOrder(a.file.path) - fileOrder(b.file.path) ||
        a.index - b.index
    )
    .map(({ file }) => file);

/* =========================================================
   MERGE FIXED FILES
========================================================= */

const mergeFixedFiles = (
  generatedProject,
  fixedFiles
) => {
  const fileMap = new Map(
    generatedProject.files.map(
      (file) => [file.path, file]
    )
  );

  for (const fixedFile of fixedFiles) {
    fileMap.set(
      fixedFile.path,
      fixedFile
    );
  }

  generatedProject.files =
    Array.from(fileMap.values());

  return generatedProject;
};

/* =========================================================
   GENERATE APPLICATION
========================================================= */

const generateApp = async (
  prompt,
  techStack = [],
  projectId = null
) => {

  /* =======================================================
     1. ARCHITECT AGENT
  ======================================================= */

  const architecture =
    await createProjectArchitecture(
      prompt,
      techStack
    );

  console.log(
    "Architecture created:",
    architecture.projectName
  );

  console.log(
    "Selected Tech Stack:",
    techStack
  );

  console.log(
    "Architecture Tech Stack:",
    architecture.techStack
  );

  console.log(
    "Total files:",
    architecture.files.length
  );

  architecture.files = orderFilesForGeneration(
    architecture.files || []
  );

  const apiContract = Array.isArray(architecture.apiContract)
    ? architecture.apiContract
    : [];

  // "python" / "java" for basic console programs, otherwise null
  const consoleLanguage = getConsoleLanguage(techStack);

  console.log(
    "API contract endpoints:",
    apiContract.length
  );

  const generatedFiles = [];

  /* =======================================================
     2. CODER AGENT - BATCH GENERATION
  ======================================================= */

  for (
    let i = 0;
    i < architecture.files.length;
    i += BATCH_SIZE
  ) {

    const batch =
      architecture.files.slice(
        i,
        i + BATCH_SIZE
      );

    const batchNumber =
      Math.floor(i / BATCH_SIZE) + 1;

    console.log(
      `\nGenerating Batch ${batchNumber}`
    );

    console.log(
      "Requested files:",
      batch.map(
        (file) => file.path
      )
    );

    try {

      const result =
        await generateBatchCode({
          projectName:
            architecture.projectName,

          description:
            architecture.description,

          techStack:
            architecture.techStack,

          files: batch,

          allFiles:
            architecture.files,

          apiContract,

          // Routes from backend files generated in earlier batches
          implementedEndpoints:
            extractBackendEndpoints(generatedFiles).endpoints,

          // Exports of files generated in earlier batches
          generatedModules: consoleLanguage
            ? summarizeConsoleModules(generatedFiles, consoleLanguage)
            : summarizeExports(generatedFiles),

          consoleLanguage,
        });

      if (
        !result ||
        !Array.isArray(result.files)
      ) {
        throw new Error(
          "Invalid AI response: files array not found"
        );
      }

      const requestedPaths =
        batch.map(
          (file) => file.path
        );

      const generatedPaths =
        result.files.map(
          (file) => file.path
        );

      const missingFiles =
        requestedPaths.filter(
          (filePath) =>
            !generatedPaths.includes(
              filePath
            )
        );

      const unexpectedFiles =
        generatedPaths.filter(
          (filePath) =>
            !requestedPaths.includes(
              filePath
            )
        );

      if (missingFiles.length > 0) {
        console.warn(
          "Missing files:",
          missingFiles
        );
      }

      if (unexpectedFiles.length > 0) {
        console.warn(
          "Unexpected files:",
          unexpectedFiles
        );
      }

      generatedFiles.push(
        ...result.files
      );

      console.log(
        `Batch ${batchNumber} completed`
      );

      console.log(
        `Total generated files: ${generatedFiles.length}`
      );

    } catch (error) {

      console.error(
        `Batch ${batchNumber} generation failed:`,
        error.message
      );

      throw error;
    }
  }

  /* =======================================================
     3. CREATE GENERATED PROJECT
  ======================================================= */

  let generatedProject = {

    projectName:
      architecture.projectName,

    description:
      architecture.description,

    techStack:
      architecture.techStack,

    files:
      generatedFiles,
  };

  /* =======================================================
     4. INITIAL STATIC VALIDATION
  ======================================================= */

  let validation =
    validateProject(
      generatedProject
    );

  console.log(
    "\nInitial Validation Result:",
    validation
  );

  /* =======================================================
     5. STATIC VALIDATION FIXER
  ======================================================= */

  let fixAttempt = 0;

  while (
    !validation.valid &&
    fixAttempt < MAX_FIX_ATTEMPTS
  ) {

    fixAttempt++;

    console.log(
      `\nFixer Agent Attempt ${fixAttempt}/${MAX_FIX_ATTEMPTS}`
    );

    console.log(
      "Errors:",
      validation.errors
    );

    try {

      const fixResult =
        await fixProject({

          projectName:
            generatedProject.projectName,

          description:
            generatedProject.description,

          techStack:
            generatedProject.techStack,

          errors:
            validation.errors,

          files:
            generatedProject.files,
        });

      if (
        !fixResult ||
        !Array.isArray(
          fixResult.files
        )
      ) {
        throw new Error(
          "Invalid Fixer Agent response"
        );
      }

      console.log(
        "Fixer modified files:",
        fixResult.files.map(
          (file) => file.path
        )
      );

      generatedProject =
        mergeFixedFiles(
          generatedProject,
          fixResult.files
        );

      validation =
        validateProject(
          generatedProject
        );

      console.log(
        `Validation after fix attempt ${fixAttempt}:`,
        validation
      );

    } catch (error) {

      console.error(
        "Fixer Agent failed:",
        error.message
      );

      break;
    }
  }

  /* =======================================================
     6. STOP IF STATIC VALIDATION FAILED
  ======================================================= */

  if (!validation.valid) {

    console.warn(
      "\n❌ Project validation failed!"
    );

    console.warn(
      "Remaining errors:",
      validation.errors
    );

    return {

      ...generatedProject,

      validation,

      fixerAttempts:
        fixAttempt,

      runtimeValidation: {
        attempted: false,

        success: false,

        skipped: true,

        reason:
          "Static validation failed",
      },
    };
  }

  console.log(
    "\n✅ Project validation successful!"
  );

  /* =======================================================
     7. WRITE GENERATED FILES TO DISK
  ======================================================= */

  if (!projectId) {

    throw new Error(
      "Project ID is required before runtime validation"
    );
  }

  console.log(
    "\n📁 Writing generated files to disk..."
  );

  let projectFilesResult =
    await generateProjectFiles(
      projectId,
      generatedProject.files
    );

  console.log(
    "Project files written successfully."
  );

  console.log(
    "Project root:",
    projectFilesResult.projectRoot
  );

  /* =======================================================
     8. DOCKER RUNTIME VALIDATION
  ======================================================= */

  let runtimeValidation = {

    attempted: true,

    success: false,

    skipped: false,

    attempts: 0,

    result: null,

    error: null,
  };

  let runtimeFixAttempt = 0;

  let runtimeSuccess = false;

  while (
    !runtimeSuccess &&
    runtimeFixAttempt <
      MAX_RUNTIME_FIX_ATTEMPTS
  ) {

    runtimeFixAttempt++;

    runtimeValidation.attempts =
      runtimeFixAttempt;

    console.log(
      `\n🐳 Runtime Validation Attempt ${runtimeFixAttempt}/${MAX_RUNTIME_FIX_ATTEMPTS}`
    );

    try {

      const runtimeResult =
        await runProject(
          projectId
        );

      if (
        !runtimeResult ||
        runtimeResult.success !== true
      ) {

        throw new Error(
          "Docker runtime validation failed"
        );
      }

      // The app starts; now check that signup/login really work
      const authSmokeTest =
        await runAuthSmokeTest({
          files: generatedProject.files,
          previewUrl:
            runtimeResult.frontend?.previewUrl,
        });

      runtimeValidation.authSmokeTest =
        authSmokeTest;

      if (authSmokeTest.skipped) {
        console.log(
          "Auth smoke test skipped:",
          authSmokeTest.reason
        );
      } else if (!authSmokeTest.success) {
        throw new Error(
          `Authentication smoke test failed: ${authSmokeTest.error}`
        );
      } else {
        console.log(
          "✅ Auth smoke test passed:",
          authSmokeTest.steps.join(", ")
        );
      }

      runtimeValidation.success =
        true;

      runtimeValidation.result =
        runtimeResult;

      runtimeValidation.error =
        null;

      runtimeSuccess = true;

      console.log(
        "\n✅ Runtime validation successful!"
      );

    } catch (error) {

      console.error(
        "\n❌ Runtime validation failed!"
      );

      console.error(
        error.message
      );

      runtimeValidation.success =
        false;

      runtimeValidation.error =
        error.message;

      /* ===================================================
         STOP IF MAX RUNTIME ATTEMPTS REACHED
      =================================================== */

      if (
        runtimeFixAttempt >=
        MAX_RUNTIME_FIX_ATTEMPTS
      ) {

        console.error(
          "\n❌ Maximum runtime fixer attempts reached."
        );

        break;
      }

      /* ===================================================
         9. RUNTIME ERROR → FIXER AGENT
      =================================================== */

      console.log(
        `\n🔧 Runtime Fixer Agent Attempt ${runtimeFixAttempt}/${MAX_RUNTIME_FIX_ATTEMPTS}`
      );

      try {

        const runtimeFixResult =
          await fixProject({

            projectName:
              generatedProject.projectName,

            description:
              generatedProject.description,

            techStack:
              generatedProject.techStack,

            errors: [
              {
                type:
                  "RUNTIME_ERROR",

                message:
                  error.message,
              },
            ],

            files:
              generatedProject.files,
          });

        if (
          !runtimeFixResult ||
          !Array.isArray(
            runtimeFixResult.files
          )
        ) {

          throw new Error(
            "Invalid Runtime Fixer Agent response"
          );
        }

        console.log(
          "Runtime Fixer modified files:",
          runtimeFixResult.files.map(
            (file) => file.path
          )
        );

        /* ===============================================
           MERGE FIXED FILES
        =============================================== */

        generatedProject =
          mergeFixedFiles(
            generatedProject,
            runtimeFixResult.files
          );

        /* ===============================================
           STATIC VALIDATION AFTER RUNTIME FIX
        =============================================== */

        validation =
          validateProject(
            generatedProject
          );

        console.log(
          "Validation after runtime fix:",
          validation
        );

        if (!validation.valid) {
  console.warn(
    "⚠️ Runtime Fixer introduced static validation errors."
  );

  console.warn(
    validation.errors
  );

  // Run the normal static Fixer
  // before trying Docker again.

  let staticFixAttempt = 0;

  while (
    !validation.valid &&
    staticFixAttempt < MAX_FIX_ATTEMPTS
  ) {
    staticFixAttempt++;

    console.log(
      `🔧 Static Fixer after runtime fix ${staticFixAttempt}/${MAX_FIX_ATTEMPTS}`
    );

    const staticFixResult = await fixProject({
      projectName:
        generatedProject.projectName,

      description:
        generatedProject.description,

      techStack:
        generatedProject.techStack,

      errors:
        validation.errors,

      files:
        generatedProject.files,
    });

    if (
      !staticFixResult ||
      !Array.isArray(
        staticFixResult.files
      )
    ) {
      throw new Error(
        "Invalid Static Fixer response after runtime fix"
      );
    }

    generatedProject =
      mergeFixedFiles(
        generatedProject,
        staticFixResult.files
      );

    validation =
      validateProject(
        generatedProject
      );

    console.log(
      "Validation after static fix:",
      validation
    );
  }

  if (!validation.valid) {
    console.warn(
      "❌ Static validation still failing after runtime fix."
    );

    runtimeValidation.error =
      validation.errors.join("\n");

    continue;
  }
}

        /* ===============================================
           WRITE FIXED FILES TO DISK
        =============================================== */

        console.log(
          "\n📁 Writing runtime-fixed files to disk..."
        );

        projectFilesResult =
          await generateProjectFiles(
            projectId,
            generatedProject.files
          );

        console.log(
          "Runtime-fixed files written successfully."
        );

      } catch (fixError) {

        console.error(
          "Runtime Fixer Agent failed:",
          fixError.message
        );

        runtimeValidation.error =
          fixError.message;

        break;
      }
    }
  }

  /* =======================================================
     10. FINAL RESULT
  ======================================================= */

  if (runtimeValidation.success) {

    console.log(
      "\n🎉 APPLICATION VERIFIED SUCCESSFULLY!"
    );

    console.log(
      "Static validation: PASS"
    );

    console.log(
      "Docker runtime validation: PASS"
    );

  } else {

    console.warn(
      "\n⚠️ APPLICATION RUNTIME VALIDATION FAILED!"
    );

    console.warn(
      "Runtime attempts:",
      runtimeValidation.attempts
    );

    console.warn(
      "Runtime error:",
      runtimeValidation.error
    );
  }

  /* =======================================================
     11. RETURN RESULT
  ======================================================= */

  return {

    ...generatedProject,

    validation,

    fixerAttempts:
      fixAttempt,

    projectRoot:
      projectFilesResult.projectRoot,

    formattedFiles:
      projectFilesResult.formattedFiles,

    runtimeValidation,
  };
};

export default generateApp;