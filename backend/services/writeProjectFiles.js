import fs from "fs/promises";
import path from "path";

const writeProjectFiles = async (projectId, files) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  if (!Array.isArray(files)) {
    throw new Error("Files must be an array");
  }

  const projectRoot = path.join(
    process.cwd(),
    "generated-projects",
    projectId.toString()
  );

  for (const file of files) {
    if (!file.path || typeof file.content !== "string") {
      continue;
    }

    const normalizedPath = file.path.replace(/\\/g, "/");

    const filePath = path.resolve(
      projectRoot,
      normalizedPath
    );

    // Security: prevent path traversal
    if (
      filePath !== projectRoot &&
      !filePath.startsWith(projectRoot + path.sep)
    ) {
      throw new Error(
        `Invalid file path: ${file.path}`
      );
    }

    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    /*
     * Runtime application data must never be overwritten
     * when project source files are synchronized.
     *
     * Example:
     * data/users.json
     * data/patients.json
     * data/nurses.json
     * data/hospitals.json
     * data/bills.json
     */
    const isRuntimeDataFile =
      normalizedPath.startsWith("data/") &&
      normalizedPath.endsWith(".json");

    if (isRuntimeDataFile) {
      try {
        await fs.access(filePath);

        console.log(
          `Skipping existing runtime data file: ${normalizedPath}`
        );

        continue;
      } catch {
        // File does not exist.
        // Create initial demo data.
      }
    }

    await fs.writeFile(
      filePath,
      file.content,
      "utf8"
    );
  }

  return {
    projectId,
    totalFiles: files.length,
  };
};

export default writeProjectFiles;