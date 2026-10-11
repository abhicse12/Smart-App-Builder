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

    const filePath = path.resolve(
      projectRoot,
      file.path
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

    await fs.mkdir(
      path.dirname(filePath),
      { recursive: true }
    );

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