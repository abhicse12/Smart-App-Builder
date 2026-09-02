import path from "path";

const validateProject = (project) => {
  const errors = [];
  const warnings = [];

  const files = project.files || [];

  if (!Array.isArray(files) || files.length === 0) {
    return {
      valid: false,
      errors: ["No files were generated"],
      warnings: [],
      totalFiles: 0,
    };
  }

  const filePaths = files.map((file) =>
    file.path.replace(/\\/g, "/")
  );

  const filePathSet = new Set(filePaths);

  // =====================================
  // 1. Empty files
  // =====================================

  for (const file of files) {
    if (
      typeof file.content !== "string" ||
      file.content.trim().length === 0
    ) {
      errors.push(`File is empty: ${file.path}`);
    }
  }

  // =====================================
  // 2. Duplicate files
  // =====================================

  if (filePathSet.size !== filePaths.length) {
    errors.push("Duplicate file paths found");
  }

  // =====================================
  // 3. Validate package.json
  // =====================================

  const packageFiles = files.filter((file) =>
    file.path.endsWith("package.json")
  );

  for (const file of packageFiles) {
    try {
      JSON.parse(file.content);
    } catch {
      errors.push(`Invalid JSON: ${file.path}`);
    }
  }

  // =====================================
  // 4. Check project structure
  // =====================================

  const hasFrontend = filePaths.some((filePath) =>
    filePath.startsWith("frontend/")
  );

  const hasBackend = filePaths.some((filePath) =>
    filePath.startsWith("backend/")
  );

  if (hasFrontend) {
    const requiredFrontendFiles = [
      "frontend/package.json",
      "frontend/index.html",
      "frontend/src/main.jsx",
      "frontend/src/App.jsx",
    ];

    for (const requiredFile of requiredFrontendFiles) {
      if (!filePathSet.has(requiredFile)) {
        errors.push(
          `Missing required frontend file: ${requiredFile}`
        );
      }
    }
  }

  if (hasBackend) {
    const requiredBackendFiles = [
      "backend/package.json",
      "backend/server.js",
    ];

    for (const requiredFile of requiredBackendFiles) {
      if (!filePathSet.has(requiredFile)) {
        errors.push(
          `Missing required backend file: ${requiredFile}`
        );
      }
    }
  }

  // =====================================
  // Helper: Check if imported file exists
  // =====================================

  const resolveImport = (currentFile, importPath) => {
    const currentDir = path.posix.dirname(
      currentFile.replace(/\\/g, "/")
    );

    const resolvedPath = path.posix.normalize(
      path.posix.join(currentDir, importPath)
    );

    const possiblePaths = [
      resolvedPath,
      `${resolvedPath}.js`,
      `${resolvedPath}.jsx`,
      `${resolvedPath}.ts`,
      `${resolvedPath}.tsx`,
      `${resolvedPath}/index.js`,
      `${resolvedPath}/index.jsx`,
    ];

    return possiblePaths.some((possiblePath) =>
      filePathSet.has(possiblePath)
    );
  };

  // =====================================
  // 5. Validate relative imports
  // =====================================

  const importRegex =
    /(?:import\s+(?:[\s\S]*?)\s+from\s+|import\s*)["']([^"']+)["']/g;

  for (const file of files) {
    const normalizedFilePath = file.path.replace(
      /\\/g,
      "/"
    );

    const isCodeFile =
      normalizedFilePath.endsWith(".js") ||
      normalizedFilePath.endsWith(".jsx") ||
      normalizedFilePath.endsWith(".ts") ||
      normalizedFilePath.endsWith(".tsx");

    if (!isCodeFile) {
      continue;
    }

    let match;

    while (
      (match = importRegex.exec(file.content)) !== null
    ) {
      const importPath = match[1];

      // Only check relative imports
      if (
        !importPath.startsWith("./") &&
        !importPath.startsWith("../")
      ) {
        continue;
      }

      const exists = resolveImport(
        normalizedFilePath,
        importPath
      );

      if (!exists) {
        errors.push(
          `Broken import in ${normalizedFilePath}: ${importPath}`
        );
      }
    }
  }

  // =====================================
  // 6. Basic dependency validation
  // =====================================

  const dependencyMap = {};

  for (const packageFile of packageFiles) {
    try {
      const packageJson = JSON.parse(packageFile.content);

      const dependencies = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };

      dependencyMap[packageFile.path] = Object.keys(
        dependencies
      );
    } catch {
      // Already handled above
    }
  }

  // =====================================
  // 7. Check common dependencies
  // =====================================

  for (const file of files) {
    const normalizedFilePath = file.path.replace(
      /\\/g,
      "/"
    );

    if (
      !normalizedFilePath.endsWith(".js") &&
      !normalizedFilePath.endsWith(".jsx")
    ) {
      continue;
    }

    // Find nearest package.json
    const packageFile = packageFiles.find((pkg) => {
      const packageDir = path.posix.dirname(
        pkg.path.replace(/\\/g, "/")
      );

      return normalizedFilePath.startsWith(packageDir);
    });

    if (!packageFile) continue;

    let packageJson;

    try {
      packageJson = JSON.parse(packageFile.content);
    } catch {
      continue;
    }

    const dependencies = {
      ...(packageJson.dependencies || {}),
      ...(packageJson.devDependencies || {}),
    };

    const packageDependencies = Object.keys(dependencies);

    const packageImportRegex =
      /from\s+["']([^./][^"']*)["']/g;

    let match;

    while (
      (match = packageImportRegex.exec(file.content)) !== null
    ) {
      const dependency = match[1];

      // Ignore Node built-in modules
      const nodeBuiltins = [
        "fs",
        "path",
        "http",
        "https",
        "crypto",
        "os",
        "util",
        "stream",
      ];

      if (nodeBuiltins.includes(dependency)) {
        continue;
      }

      // Ignore subpath imports for now
      const packageName = dependency.startsWith("@")
        ? dependency.split("/").slice(0, 2).join("/")
        : dependency.split("/")[0];

      if (!packageDependencies.includes(packageName)) {
        warnings.push(
          `Possible missing dependency "${packageName}" used in ${normalizedFilePath}`
        );
      }
    }
  }

  // =====================================
  // Final Result
  // =====================================

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalFiles: files.length,
  };
};

export default validateProject;