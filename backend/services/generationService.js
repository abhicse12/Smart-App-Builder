import createProjectArchitecture from "./architectService.js";
import generateBatchCode from "./batchCoderService.js";
import validateProject from "./validatorService.js";
import fixProject from "./fixerService.js";

const BATCH_SIZE = 4;
const MAX_FIX_ATTEMPTS = 3;

const generateApp = async (prompt) => {
  // ==========================================
  // 1. ARCHITECT AGENT
  // ==========================================

  const architecture = await createProjectArchitecture(prompt);

  console.log(
    "Architecture created:",
    architecture.projectName
  );

  console.log(
    "Total files:",
    architecture.files.length
  );

  const generatedFiles = [];

  // ==========================================
  // 2. CODER AGENT - BATCH GENERATION
  // ==========================================

  for (
    let i = 0;
    i < architecture.files.length;
    i += BATCH_SIZE
  ) {
    const batch = architecture.files.slice(
      i,
      i + BATCH_SIZE
    );

    const batchNumber =
      Math.floor(i / BATCH_SIZE) + 1;

    console.log(`\nGenerating Batch ${batchNumber}`);

    console.log(
      "Requested files:",
      batch.map((file) => file.path)
    );

    try {
      const result = await generateBatchCode({
        projectName: architecture.projectName,
        description: architecture.description,
        techStack: architecture.techStack,
        files: batch,
        allFiles: architecture.files,
      });

      if (
        !result ||
        !Array.isArray(result.files)
      ) {
        throw new Error(
          "Invalid AI response: files array not found"
        );
      }

      const requestedPaths = batch.map(
        (file) => file.path
      );

      const generatedPaths = result.files.map(
        (file) => file.path
      );

      const missingFiles =
        requestedPaths.filter(
          (filePath) =>
            !generatedPaths.includes(filePath)
        );

      const unexpectedFiles =
        generatedPaths.filter(
          (filePath) =>
            !requestedPaths.includes(filePath)
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

      generatedFiles.push(...result.files);

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

  // ==========================================
  // 3. CREATE PROJECT OBJECT
  // ==========================================

  let generatedProject = {
    projectName: architecture.projectName,
    description: architecture.description,
    techStack: architecture.techStack,
    files: generatedFiles,
  };

  // ==========================================
  // 4. INITIAL VALIDATION
  // ==========================================

  let validation =
    validateProject(generatedProject);

  console.log(
    "\nInitial Validation Result:",
    validation
  );

  // ==========================================
  // 5. FIXER AGENT
  // ==========================================

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
      const fixResult = await fixProject({
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
        !Array.isArray(fixResult.files)
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

      // ========================================
      // Replace corrected files
      // ========================================

      const fileMap = new Map(
        generatedProject.files.map(
          (file) => [file.path, file]
        )
      );

      for (const fixedFile of fixResult.files) {
        fileMap.set(
          fixedFile.path,
          fixedFile
        );
      }

      generatedProject.files =
        Array.from(fileMap.values());

      // ========================================
      // Re-validate
      // ========================================

      validation =
        validateProject(generatedProject);

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

  // ==========================================
  // 6. FINAL RESULT
  // ==========================================

  if (validation.valid) {
    console.log(
      "\n✅ Project validation successful!"
    );
  } else {
    console.warn(
      "\n❌ Project validation failed!"
    );

    console.warn(
      "Remaining errors:",
      validation.errors
    );
  }

  return {
    ...generatedProject,
    validation,
    fixerAttempts: fixAttempt,
  };
};

export default generateApp;