const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\/+/, "");

const validateStructure = ({
  files = [],
  errors = [],
  warnings = [],
}) => {
  // No files
  if (!Array.isArray(files) || files.length === 0) {
    errors.push("Generated project contains no files.");
    return;
  }

  // Empty files
  for (const file of files) {
    if (
      !file ||
      typeof file.path !== "string" ||
      typeof file.content !== "string"
    ) {
      errors.push("Invalid generated file structure.");
      continue;
    }

    // Python package markers are empty by design
    if (
      file.content.trim().length === 0 &&
      !/(^|\/)__init__\.py$/.test(normalizePath(file.path))
    ) {
      warnings.push(`Empty file detected: ${file.path}`);
    }
  }

  // Duplicate file paths
  const seenPaths = new Set();

  for (const file of files) {
    if (!file?.path) continue;

    const normalizedPath = normalizePath(file.path);

    if (seenPaths.has(normalizedPath)) {
      errors.push(
        `Duplicate file path detected: ${normalizedPath}`
      );
    }

    seenPaths.add(normalizedPath);
  }
};

export default validateStructure;