import fs from "fs";
import path from "path";
import validateProject from "./services/validatorService.js";

const projectId = "6aa31f95767d915bbe06cf07";

const projectPath = path.join(
  process.cwd(),
  "generated-projects",
  projectId
);

const files = [];

const readFiles = (dir) => {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules") {
        continue;
      }

      readFiles(fullPath);
    } else {
      const relativePath = path
        .relative(projectPath, fullPath)
        .replace(/\\/g, "/");

      files.push({
        path: relativePath,
        content: fs.readFileSync(fullPath, "utf8"),
      });
    }
  }
};

readFiles(projectPath);

const result = validateProject({ files });

console.log("\nValidation Result:\n");
console.dir(result, { depth: null });