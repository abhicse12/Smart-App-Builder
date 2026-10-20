import fs from "fs/promises";
import path from "path";
import Project from "../models/Project.js";

// Directories that hold dependencies, build output or tool caches,
// never source code
const SKIPPED_DIRECTORIES = new Set([
  "node_modules",
  "dist",
  "build",
  ".git",
  ".vite",
  ".next",
  "coverage",
  ".cache",
]);

// Larger files are almost certainly not hand-written source
const MAX_FILE_BYTES = 1024 * 1024;

// .env and .env.* hold secrets; .env.example is documentation
const isSecretEnvFile = (name) =>
  (name === ".env" || name.startsWith(".env.")) &&
  name !== ".env.example";

// Binary files contain NUL bytes; text source files do not
const isBinary = (buffer) =>
  buffer.subarray(0, 8000).includes(0);

const syncProjectFiles = async (projectId) => {
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  const projectRoot = path.join(
    process.cwd(),
    "generated-projects",
    projectId.toString()
  );

  const files = [];
  const skipped = [];

  const readDirectory = async (directory) => {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(
        directory,
        entry.name
      );

      const relativePath = path
        .relative(projectRoot, fullPath)
        .replace(/\\/g, "/");

      if (entry.isSymbolicLink()) {
        skipped.push(`${relativePath} (symlink)`);
        continue;
      }

      if (entry.isDirectory()) {
        if (SKIPPED_DIRECTORIES.has(entry.name)) {
          continue;
        }

        await readDirectory(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      // Don't store environment secrets
      if (isSecretEnvFile(entry.name)) {
        continue;
      }

      // Leftover temp files (e.g. from interrupted atomic writes)
      if (entry.name.endsWith(".tmp")) {
        skipped.push(`${relativePath} (temp file)`);
        continue;
      }

      const buffer = await fs.readFile(fullPath);

      if (buffer.length > MAX_FILE_BYTES) {
        skipped.push(`${relativePath} (${buffer.length} bytes)`);
        continue;
      }

      if (isBinary(buffer)) {
        skipped.push(`${relativePath} (binary)`);
        continue;
      }

      files.push({
        path: relativePath,
        content: buffer.toString("utf8"),
      });
    }
  };

  await readDirectory(projectRoot);

  if (skipped.length > 0) {
    console.log(
      `syncProjectFiles: skipped ${skipped.length} file(s):`,
      skipped
    );
  }

  const project = await Project.findById(projectId);

  if (!project) {
    throw new Error("Project not found");
  }

  project.files = files;

  await project.save();

  return {
    projectId,
    totalFiles: files.length,
  };
};

export default syncProjectFiles;