import fs from "fs/promises";
import path from "path";
import {
  isEnvFile,
  stripUnreachableMongoUri,
} from "./sandboxEnv.js";

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
     * backend/data/users.json
     * backend/data/tasks.json
     * data/users.json
     */

    // Project-relative path with "/" separators
    // (handles "\", "./" and redundant segments)
    const relativePath = path
      .relative(projectRoot, filePath)
      .split(path.sep)
      .join("/")
      .toLowerCase();

    const isRuntimeDataFile =
      relativePath.startsWith("backend/data/") ||
      (relativePath.startsWith("data/") &&
        relativePath.endsWith(".json"));

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

    let content = file.content;

    // Never write a MONGO_URI that cannot exist in the sandbox
    // (e.g. mongodb://mongodb:27017); it breaks JSON demo mode.
    if (isEnvFile(normalizedPath)) {
      const sanitized = stripUnreachableMongoUri(content);

      if (sanitized.removedHosts.length > 0) {
        console.warn(
          `Removed sandbox-unreachable MONGO_URI (${sanitized.removedHosts.join(", ")}) from ${normalizedPath}`
        );
        content = sanitized.content;
      }
    }

    await fs.writeFile(
      filePath,
      content,
      "utf8"
    );
  }

  return {
    projectId,
    totalFiles: files.length,
  };
};

export default writeProjectFiles;