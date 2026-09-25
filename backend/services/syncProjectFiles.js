import fs from "fs/promises";
import path from "path";
import Project from "../models/Project.js";

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

  const readDirectory = async (directory) => {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(
        directory,
        entry.name
      );

      if (entry.isDirectory()) {
        // Never store node_modules in Project.files
        if (entry.name === "node_modules") {
          continue;
        }

        await readDirectory(fullPath);
        continue;
      }

      const relativePath = path
        .relative(projectRoot, fullPath)
        .replace(/\\/g, "/");

      // Don't store environment secrets
      if (
        entry.name === ".env" ||
        relativePath.includes("node_modules/")
      ) {
        continue;
      }

      const content = await fs.readFile(
        fullPath,
        "utf8"
      );

      files.push({
        path: relativePath,
        content,
      });
    }
  };

  await readDirectory(projectRoot);

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