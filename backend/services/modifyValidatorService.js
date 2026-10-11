import fs from "fs/promises";
import path from "path";

const modifyValidatorService = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const projectRoot = path.join(
    process.cwd(),
    "generated-projects",
    projectId.toString()
  );

  try {
    await fs.access(projectRoot);
  } catch {
    return {
      valid: false,
      errors: ["Generated project directory not found"],
    };
  }

  const errors = [];

  const checkDirectory = async (directory) => {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      if (entry.name === "node_modules") {
        continue;
      }

      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await checkDirectory(fullPath);
        continue;
      }

      // Check JavaScript / JSX files for basic syntax errors
      if (
        entry.name.endsWith(".js") ||
        entry.name.endsWith(".jsx")
      ) {
        const content = await fs.readFile(
          fullPath,
          "utf8"
        );

        if (!content.trim()) {
          errors.push(
            `${path.relative(projectRoot, fullPath)} is empty`
          );
        }
      }
    }
  };

  try {
    await checkDirectory(projectRoot);
  } catch (error) {
    errors.push(error.message);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export default modifyValidatorService;