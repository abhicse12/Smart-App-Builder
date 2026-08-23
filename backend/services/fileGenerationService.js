import fs from "fs/promises";
import path from "path";
import prettier from "prettier";

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

  await fs.mkdir(projectRoot, { recursive: true });

  const formattedFiles = [];

  for (const file of files) {
    if (!file.path || typeof file.content !== "string") {
      continue;
    }

    const safePath = path.normalize(file.path);

    if (
      safePath.startsWith("..") ||
      path.isAbsolute(safePath)
    ) {
      console.warn(`Skipped unsafe file path: ${file.path}`);
      continue;
    }

    const filePath = path.join(projectRoot, safePath);

    await fs.mkdir(path.dirname(filePath), {
      recursive: true,
    });

    let formattedContent = file.content;

    try {
      formattedContent = await prettier.format(file.content, {
        filepath: filePath,
      });
    } catch (formatError) {
      console.warn(
        `Could not format ${file.path}:`,
        formatError.message
      );
    }

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