import path from "path";

const validateProject = (project) => {
  const errors = [];
  const warnings = [];
  const files = project.files || [];

  // =====================================
  // 0. Basic validation
  // =====================================

  if (!Array.isArray(files) || files.length === 0) {
    return {
      valid: false,
      errors: ["No files were generated"],
      warnings: [],
      totalFiles: 0,
    };
  }

  const normalizePath = (filePath) =>
    filePath.replace(/\\/g, "/");

  const filePaths = files.map((file) =>
    normalizePath(file.path)
  );

  const filePathSet = new Set(filePaths);

  const fileMap = new Map(
    files.map((file) => [
      normalizePath(file.path),
      file.content,
    ])
  );

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
    normalizePath(file.path).endsWith("package.json")
  );

  for (const file of packageFiles) {
    try {
      JSON.parse(file.content);
    } catch {
      errors.push(`Invalid JSON: ${file.path}`);
    }
  }

  // =====================================
  // 4. Project structure
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
      "frontend/vite.config.js",
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

    // React + Vite should not use CRA
    const frontendPackage = fileMap.get(
      "frontend/package.json"
    );

    if (frontendPackage) {
      try {
        const pkg = JSON.parse(frontendPackage);

        if (pkg.dependencies?.["react-scripts"]) {
          errors.push(
            "Frontend uses react-scripts. React + Vite projects must not use react-scripts."
          );
        }

        if (
          !pkg.dependencies?.vite &&
          !pkg.devDependencies?.vite
        ) {
          warnings.push(
            "Vite dependency not found in frontend/package.json"
          );
        }
      } catch {
        // Already handled by package.json validation
      }
    }
  }

  if (hasBackend) {
    const requiredBackendFiles = [
      "backend/package.json",
      "backend/server.js",
      "backend/app.js",
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
  // 5. Detect duplicate MERN structures
  // =====================================

  const hasClientFolder = filePaths.some((filePath) =>
    filePath.startsWith("client/")
  );

  const hasServerFolder = filePaths.some((filePath) =>
    filePath.startsWith("server/")
  );

  if (hasFrontend && hasClientFolder) {
    errors.push(
      "Duplicate frontend structure detected: both frontend/ and client/ exist."
    );
  }

  if (hasBackend && hasServerFolder) {
    errors.push(
      "Duplicate backend structure detected: both backend/ and server/ exist."
    );
  }

  // =====================================
  // Helper: Resolve relative imports
  // =====================================

  const resolveImport = (currentFile, importPath) => {
    const currentDir = path.posix.dirname(
      normalizePath(currentFile)
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
      `${resolvedPath}.json`,
      `${resolvedPath}/index.js`,
      `${resolvedPath}/index.jsx`,
    ];

    return possiblePaths.some((possiblePath) =>
      filePathSet.has(possiblePath)
    );
  };

  // =====================================
  // 6 + 7. Validate imports
  // =====================================

  const esImportRegex =
    /import\s+(?:(?:[\s\S]*?)\s+from\s+)?["']([^"']+)["']/g;

  const requireRegex =
    /require\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const file of files) {
    const normalizedFilePath = normalizePath(file.path);

    const isCodeFile =
      normalizedFilePath.endsWith(".js") ||
      normalizedFilePath.endsWith(".jsx") ||
      normalizedFilePath.endsWith(".ts") ||
      normalizedFilePath.endsWith(".tsx");

    if (!isCodeFile) {
      continue;
    }

    const importPaths = [];

    let match;

    while (
      (match = esImportRegex.exec(file.content)) !== null
    ) {
      importPaths.push(match[1]);
    }

    while (
      (match = requireRegex.exec(file.content)) !== null
    ) {
      importPaths.push(match[1]);
    }

    for (const importPath of importPaths) {
      // Only validate local relative imports.
      // Packages like express, mongoose, react etc. are
      // handled separately through package.json.
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
  // 8. Route → Controller validation
  // =====================================

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);

    if (!normalizedPath.includes("/routes/")) {
      continue;
    }

    const controllerMatches = [
      ...file.content.matchAll(
        /require\s*\(\s*["']([^"']*controllers\/[^"']+)["']\s*\)/g
      ),
    ];

    for (const match of controllerMatches) {
      const controllerImport = match[1];

      const controllerPath =
        path.posix.normalize(
          path.posix.join(
            path.posix.dirname(normalizedPath),
            controllerImport
          )
        );

      const possibleControllerPaths = [
        controllerPath,
        `${controllerPath}.js`,
      ];

      const actualControllerPath =
        possibleControllerPaths.find((p) =>
          filePathSet.has(p)
        );

      if (!actualControllerPath) {
        continue;
      }

      const controllerContent =
        fileMap.get(actualControllerPath);

      if (!controllerContent) {
        continue;
      }

      // Example:
      // const {
      //   createBill,
      //   getBills
      // } = require("../controllers/billController");

      const destructuredMatch =
        file.content.match(
          /const\s*\{([^}]+)\}\s*=\s*require\s*\(\s*["'][^"']*controllers\/[^"']+["']\s*\)/
        );

      if (!destructuredMatch) {
        continue;
      }

      const importedFunctions =
        destructuredMatch[1]
          .split(",")
          .map((name) =>
            name.trim().split("=")[0].trim()
          )
          .filter(Boolean);

      for (const functionName of importedFunctions) {
        const exportRegex = new RegExp(
          `exports\\.${functionName}\\s*=`
        );

        const moduleExportRegex = new RegExp(
          `${functionName}\\s*:`
        );

        if (
          !exportRegex.test(controllerContent) &&
          !moduleExportRegex.test(controllerContent)
        ) {
          errors.push(
            `Route/controller mismatch: ${normalizedPath} imports "${functionName}", but ${actualControllerPath} does not export it.`
          );
        }
      }
    }
  }

  // =====================================
  // 9. Model → Method consistency
  // =====================================
  //
  // Detects runtime bugs like:
  //
  // const user = await User.findOne(...)
  // user.matchPassword(...)
  //
  // when User.js does NOT define:
  //
  // userSchema.methods.matchPassword = ...
  //
  // =====================================

  const modelMethods = new Map();

  // -------------------------------------
  // 9.1 Collect methods from model files
  // -------------------------------------

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);

    if (!normalizedPath.includes("/models/")) {
      continue;
    }

    // Find:
    // userSchema.methods.matchPassword = ...
    // patientSchema.methods.someMethod = ...
    const methodMatches = [
      ...file.content.matchAll(
        /\w+Schema\.methods\.(\w+)\s*=/g
      ),
    ];

    const methods = methodMatches.map(
      (match) => match[1]
    );

    const modelNameMatch =
      file.content.match(
        /mongoose\.model\(\s*["']([^"']+)["']/
      );

    if (!modelNameMatch) {
      continue;
    }

    const modelName = modelNameMatch[1];

    modelMethods.set(modelName, methods);
  }

  // -------------------------------------
  // 9.2 Check controller/service usage
  // -------------------------------------

  for (const file of files) {
    const normalizedPath = normalizePath(file.path);

    const isControllerOrService =
      normalizedPath.includes("/controllers/") ||
      normalizedPath.includes("/services/");

    if (!isControllerOrService) {
      continue;
    }

    // Example:
    //
    // const User = require("../models/User");
    //
    const modelImports = [
      ...file.content.matchAll(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*["'][^"']*\/models\/(\w+)["']\s*\)/g
      ),
    ];

    for (const match of modelImports) {
      const modelVariable = match[1];
      const modelName = match[2];

      const allowedMethods =
        modelMethods.get(modelName) || [];

      // Find documents returned from mongoose queries:
      //
      // const user = await User.findOne(...)
      // const patient = await Patient.findById(...)
      //
      const documentQueryRegex = new RegExp(
        `(?:const|let|var)\\s+(\\w+)\\s*=\\s*await\\s+${modelVariable}\\.(findOne|findById|findByIdAndUpdate|findByIdAndDelete|findOneAndUpdate|findOneAndDelete)\\s*\\(`,
        "g"
      );

      const documentVariables = [
        ...file.content.matchAll(
          documentQueryRegex
        ),
      ].map((match) => match[1]);

      for (const documentVariable of documentVariables) {
        // Find:
        //
        // user.matchPassword(...)
        // patient.someMethod(...)
        //
        const methodCallRegex = new RegExp(
          `\\b${documentVariable}\\.(\\w+)\\s*\\(`,
          "g"
        );

        const methodCalls = [
          ...file.content.matchAll(
            methodCallRegex
          ),
        ];

        for (const methodMatch of methodCalls) {
          const methodName = methodMatch[1];

          // Normal Mongoose/document methods that
          // should NOT be considered custom model methods.
          const ignoredMethods = [
            "save",
            "populate",
            "select",
            "lean",
            "exec",
            "toObject",
            "toJSON",
            "validate",
            "validateSync",
          ];

          if (ignoredMethods.includes(methodName)) {
            continue;
          }

          if (!allowedMethods.includes(methodName)) {
            errors.push(
              `Model method mismatch in ${normalizedPath}: "${documentVariable}.${methodName}()" is used, but ${modelName} model does not define schema.methods.${methodName}().`
            );
          }
        }
      }
    }
  }

  // =====================================
  // 10. Billing logic validation
  // =====================================

  const billingFiles = files.filter((file) => {
    const normalizedPath = normalizePath(file.path);

    return (
      normalizedPath.includes("bill") ||
      normalizedPath.includes("billing") ||
      normalizedPath.includes("assignment")
    );
  });

  for (const file of billingFiles) {
    const content = file.content;

    const usesHourlyBilling =
      /hoursWorked|hourlyRate|hourlyRatePaidToNurse|hourlyRateChargedToPatient/.test(
        content
      );

    if (usesHourlyBilling) {
      errors.push(
        `Invalid billing logic in ${file.path}: hourly billing detected. This project requires daily billing using numberOfDays, nurseDailyRate and patientDailyRate.`
      );
    }
  }

  // =====================================
  // 11. Required daily billing fields
  // =====================================

  const billModel = fileMap.get(
    "backend/models/Bill.js"
  );

  if (billModel) {
    const requiredBillingFields = [
      "numberOfDays",
      "nurseDailyRate",
      "patientDailyRate",
    ];

    for (const field of requiredBillingFields) {
      if (!billModel.includes(field)) {
        warnings.push(
          `Bill model may be missing required field: ${field}`
        );
      }
    }
  }

  // =====================================
  // 12. Final result
  // =====================================

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalFiles: files.length,
  };
};

export default validateProject;