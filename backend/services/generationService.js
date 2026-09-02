import createProjectArchitecture from "./architectService.js";
import generateBatchCode from "./batchCoderService.js";
import validateProject from "./validatorService.js";

const BATCH_SIZE = 4;

const generateApp = async (prompt) => {
  // ==============================
  // STEP 1: Create architecture
  // ==============================

  const architecture =
    await createProjectArchitecture(prompt);

  console.log(
    "Architecture created:",
    architecture.projectName
  );

  console.log(
    "Total files:",
    architecture.files.length
  );

  // ==============================
  // STEP 2: Generate files in batches
  // ==============================

  const generatedFiles = [];

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

    console.log(
      `\nGenerating Batch ${batchNumber}`
    );

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

      // Validate response structure
      if (
        !result ||
        !Array.isArray(result.files)
      ) {
        throw new Error(
          "Invalid AI response: files array not found"
        );
      }

      // Requested paths
      const requestedPaths = batch.map(
        (file) => file.path
      );

      // Generated paths
      const generatedPaths = result.files.map(
        (file) => file.path
      );

      // Find missing files
      const missingFiles =
        requestedPaths.filter(
          (path) =>
            !generatedPaths.includes(path)
        );

      // Find unexpected files
      const unexpectedFiles =
        generatedPaths.filter(
          (path) =>
            !requestedPaths.includes(path)
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

      // Add generated files
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

  // ==============================
  // STEP 3: Create generated project
  // ==============================

  const generatedProject = {
    projectName: architecture.projectName,
    description: architecture.description,
    techStack: architecture.techStack,
    files: generatedFiles,
  };

  // ==============================
  // STEP 4: Validate project
  // ==============================

  const validation =
    validateProject(generatedProject);

  console.log(
    "\nValidation Result:",
    validation
  );

  if (!validation.valid) {
    console.warn(
      "\nProject validation failed!"
    );

    console.warn(
      validation.errors
    );
  } else {
    console.log(
      "\nProject validation successful!"
    );
  }

  // ==============================
  // STEP 5: Return final project
  // ==============================

  return {
    ...generatedProject,
    validation,
  };
};

export default generateApp;