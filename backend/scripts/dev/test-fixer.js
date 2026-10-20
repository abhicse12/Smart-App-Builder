import dotenv from "dotenv";

dotenv.config();

import fs from "fs";
import path from "path";

import fixProject from "../../services/fixerService.js";
import validateProject from "../../services/validatorService.js";

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

const writeFiles = (fixedFiles) => {
  for (const file of fixedFiles) {
    const filePath = path.join(
      projectPath,
      file.path
    );

    const directory = path.dirname(filePath);

    fs.mkdirSync(directory, {
      recursive: true,
    });

    fs.writeFileSync(
      filePath,
      file.content,
      "utf8"
    );
  }
};

const main = async () => {
  console.log("\nReading generated project...\n");

  readFiles(projectPath);

  console.log(
    "Total files:",
    files.length
  );

  // ==========================================
  // 1. VALIDATE CURRENT PROJECT
  // ==========================================

  const validation =
    validateProject({ files });

  console.log(
    "\nCurrent Validation:\n"
  );

  console.dir(validation, {
    depth: null,
  });

  if (validation.valid) {
    console.log(
      "\n✅ Project is already valid."
    );

    return;
  }

  // ==========================================
  // 2. RUN FIXER AGENT
  // ==========================================

  console.log(
    "\n🤖 Running Fixer Agent...\n"
  );

  const fixResult = await fixProject({
    projectName:
      "Caregiving Foundation Bill Management System",

    description:
      "MERN-based caregiving foundation bill management system.",

    techStack: [
      "MongoDB",
      "Express",
      "React",
      "Vite",
      "Node.js",
    ],

    errors: validation.errors,

    files,
  });

  if (
    !fixResult ||
    !Array.isArray(fixResult.files)
  ) {
    throw new Error(
      "Fixer Agent returned invalid response"
    );
  }

  console.log(
    "\nFiles modified by Fixer:"
  );

  console.log(
    fixResult.files.map(
      (file) => file.path
    )
  );

  // ==========================================
  // 3. SAVE FIXED FILES
  // ==========================================

  writeFiles(fixResult.files);

  console.log(
    "\n✅ Fixed files saved."
  );

  // ==========================================
  // 4. READ PROJECT AGAIN
  // ==========================================

  const updatedFiles = [];

  const readUpdatedFiles = (dir) => {
    const entries = fs.readdirSync(dir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(
        dir,
        entry.name
      );

      if (entry.isDirectory()) {
        if (entry.name === "node_modules") {
          continue;
        }

        readUpdatedFiles(fullPath);
      } else {
        const relativePath = path
          .relative(projectPath, fullPath)
          .replace(/\\/g, "/");

        updatedFiles.push({
          path: relativePath,
          content: fs.readFileSync(
            fullPath,
            "utf8"
          ),
        });
      }
    }
  };

  readUpdatedFiles(projectPath);

  // ==========================================
  // 5. VALIDATE AGAIN
  // ==========================================

  const finalValidation =
    validateProject({
      files: updatedFiles,
    });

  console.log(
    "\n================================="
  );

  console.log(
    "FINAL VALIDATION RESULT"
  );

  console.log(
    "=================================\n"
  );

  console.dir(finalValidation, {
    depth: null,
  });

  if (finalValidation.valid) {
    console.log(
      "\n🎉 FIXER AGENT SUCCESS!"
    );
  } else {
    console.log(
      "\n❌ Some errors still remain."
    );
  }
};

main().catch((error) => {
  console.error(
    "\nFixer Test Error:",
    error
  );
});