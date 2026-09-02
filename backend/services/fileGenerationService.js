import fs from "fs/promises";
import path from "path";
import prettier from "prettier";

const FORMATTABLE_EXTENSIONS = new Set([
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".css",
  ".html",
  ".md",
  ".yml",
  ".yaml",
]);

const shouldFormatFile = (filePath) => {
  const fileName = path.basename(filePath);

  // Skip special files
  const skippedFiles = [
    ".gitignore",
    ".env",
    ".env.example",
    ".env.local",
    ".env.production",
    ".env.development",
  ];

  if (skippedFiles.includes(fileName)) {
    return false;
  }

  const extension = path.extname(fileName);

  return FORMATTABLE_EXTENSIONS.has(extension);
};

const generateProjectFiles = async (projectId, files) => {
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

  // Create root project directory
  await fs.mkdir(projectRoot, {
    recursive: true,
  });

  const formattedFiles = [];

  for (const file of files) {
    if (!file.path || typeof file.content !== "string") {
      console.warn("Skipped invalid file:", file.path);
      continue;
    }

    // Prevent path traversal
    const safePath = path.normalize(file.path);

    if (
      safePath.startsWith("..") ||
      path.isAbsolute(safePath)
    ) {
      console.warn(
        `Skipped unsafe file path: ${file.path}`
      );
      continue;
    }

    const filePath = path.join(
      projectRoot,
      safePath
    );

    // Create required directories
    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    let formattedContent = file.content;

    // Format only supported source files
    if (shouldFormatFile(file.path)) {
      try {
        formattedContent = await prettier.format(
          file.content,
          {
            filepath: filePath,
          }
        );

        console.log(`Formatted: ${file.path}`);
      } catch (formatError) {
        console.warn(
          `Could not format ${file.path}:`,
          formatError.message
        );
      }
    } else {
      console.log(`Skipped formatting: ${file.path}`);
    }

    // Write file
    await fs.writeFile(
      filePath,
      formattedContent,
      "utf8"
    );

    formattedFiles.push({
      path: file.path,
      content: formattedContent,
    });
  }

  return {
    projectRoot,
    formattedFiles,
  };
};

export default generateProjectFiles;