import path from "path";
import validateStructure from "./validators/structureValidator.js";
import validateRuntime from "./validators/runtimeValidator.js";
import validateFeatureCompleteness from "./validators/featureValidator.js";
import validateApiContract from "./validators/apiContractValidator.js";
import validateModuleExports from "./validators/moduleExportsValidator.js";
import validateDataFiles from "./validators/dataFilesValidator.js";
import validateConsoleProject from "./validators/consoleValidator.js";
import { detectConsoleLanguageFromFiles } from "./consoleProject.js";

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
  validateStructure({
    files,
    errors,
    warnings,
  });

  // Basic Python / Java console projects: none of the web checks apply
  const consoleLanguage = detectConsoleLanguageFromFiles(files);

  if (consoleLanguage) {
    validateConsoleProject({
      files,
      language: consoleLanguage,
      errors,
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      totalFiles: files.length,
      projectType: consoleLanguage,
    };
  }

  validateFeatureCompleteness({
    files,
    errors,
    warnings,
  });

  validateRuntime({
    files,
    errors,
    warnings,
  });

  // Frontend calls ↔ mounted backend routes, and auth wiring
  validateApiContract({
    files,
    errors,
    warnings,
  });

  // Imported names must be exported by the imported local file
  validateModuleExports({
    files,
    errors,
  });

  // backend/data/*.json valid, and read-only catalogs seeded
  validateDataFiles({
    files,
    errors,
  });

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
  // Helper functions
  // =====================================

  const hasFile = (filePath) =>
    filePathSet.has(normalizePath(filePath));

  const getFile = (filePath) =>
    fileMap.get(normalizePath(filePath));

  const findFilesContaining = (pattern) =>
    files.filter((file) =>
      pattern.test(file.content)
    );

  const getPackageJson = (filePath) => {
    const content = getFile(filePath);

    if (!content) {
      return null;
    }

    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  const dependencyExists = (
    packageJson,
    dependency
  ) => {
    if (!packageJson) {
      return false;
    }

    return Boolean(
      packageJson.dependencies?.[dependency] ||
        packageJson.devDependencies?.[dependency] ||
        packageJson.peerDependencies?.[dependency]
    );
  };

  // =====================================
  // 1. Empty files
  // =====================================

  for (const file of files) {
    if (
      typeof file.content !== "string" ||
      file.content.trim().length === 0
    ) {
      errors.push(
        `File is empty: ${file.path}`
      );
    }
  }

  // =====================================
  // 2. Duplicate files
  // =====================================

  if (filePathSet.size !== filePaths.length) {
    errors.push(
      "Duplicate file paths found"
    );
  }

  // =====================================
  // 3. Validate package.json
  // =====================================

  const packageFiles = files.filter((file) =>
    normalizePath(file.path).endsWith(
      "package.json"
    )
  );

  for (const file of packageFiles) {
    try {
      JSON.parse(file.content);
    } catch {
      errors.push(
        `Invalid JSON: ${file.path}`
      );
    }
  }

  // =====================================
  // 4. Detect frontend/backend
  // =====================================

  const hasFrontend = filePaths.some(
    (filePath) =>
      filePath.startsWith("frontend/")
  );

  const hasBackend = filePaths.some(
    (filePath) =>
      filePath.startsWith("backend/")
  );

  // =====================================
  // 5. Frontend structure
  // =====================================

  if (hasFrontend) {
    const requiredFrontendFiles = [
      "frontend/package.json",
      "frontend/index.html",
      "frontend/vite.config.js",
      "frontend/src/main.jsx",
      "frontend/src/App.jsx",
      "frontend/src/index.css",
    ];

    for (const requiredFile of requiredFrontendFiles) {
      if (!hasFile(requiredFile)) {
        errors.push(
          `Missing required frontend file: ${requiredFile}`
        );
      }
    }

    const frontendPackage =
      getPackageJson(
        "frontend/package.json"
      );

    if (frontendPackage) {
      // React
      if (
        !dependencyExists(
          frontendPackage,
          "react"
        )
      ) {
        errors.push(
          "React dependency missing from frontend/package.json"
        );
      }

      // React DOM
      if (
        !dependencyExists(
          frontendPackage,
          "react-dom"
        )
      ) {
        errors.push(
          "react-dom dependency missing from frontend/package.json"
        );
      }

      // Vite
      if (
        !dependencyExists(
          frontendPackage,
          "vite"
        )
      ) {
        errors.push(
          "Vite dependency missing from frontend/package.json"
        );
      }

      // React Vite plugin
      if (
        !dependencyExists(
          frontendPackage,
          "@vitejs/plugin-react"
        )
      ) {
        warnings.push(
          "@vitejs/plugin-react dependency missing from frontend/package.json"
        );
      }

      // CRA detection
      if (
        frontendPackage.dependencies?.[
          "react-scripts"
        ]
      ) {
        errors.push(
          "Frontend uses react-scripts. React + Vite projects must not use react-scripts."
        );
      }

      // Required scripts
      if (
        !frontendPackage.scripts?.dev
      ) {
        errors.push(
          "Frontend package.json is missing the dev script."
        );
      }

      if (
        !frontendPackage.scripts?.build
      ) {
        errors.push(
          "Frontend package.json is missing the build script."
        );
      }

      if (
        !frontendPackage.scripts?.preview
      ) {
        warnings.push(
          "Frontend package.json is missing the preview script."
        );
      }
    }
  }

  // =====================================
  // 6. Backend structure
  // =====================================

  if (hasBackend) {
    const requiredBackendFiles = [
      "backend/package.json",
      "backend/server.js",
      "backend/app.js",
    ];

    for (const requiredFile of requiredBackendFiles) {
      if (!hasFile(requiredFile)) {
        errors.push(
          `Missing required backend file: ${requiredFile}`
        );
      }
    }

    const backendPackage =
      getPackageJson(
        "backend/package.json"
      );

    if (backendPackage) {
      if (
        !dependencyExists(
          backendPackage,
          "express"
        )
      ) {
        errors.push(
          "Express dependency missing from backend/package.json"
        );
      }

      if (
        !backendPackage.scripts?.start
      ) {
        errors.push(
          "Backend package.json is missing the start script."
        );
      }
    }
  }

  // =====================================
  // 7. Duplicate MERN structures
  // =====================================

  const hasClientFolder = filePaths.some(
    (filePath) =>
      filePath.startsWith("client/")
  );

  const hasServerFolder = filePaths.some(
    (filePath) =>
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
  // 8. Helper: Resolve local imports
  // =====================================

  const resolveImport = (
    currentFile,
    importPath
  ) => {
    const currentDir =
      path.posix.dirname(
        normalizePath(currentFile)
      );

    const resolvedPath =
      path.posix.normalize(
        path.posix.join(
          currentDir,
          importPath
        )
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
      `${resolvedPath}/index.ts`,
      `${resolvedPath}/index.tsx`,
    ];

    return possiblePaths.some(
      (possiblePath) =>
        filePathSet.has(possiblePath)
    );
  };

  // =====================================
  // 9. Validate imports
  // =====================================

  const esImportRegex =
    /import\s+(?:(?:[\s\S]*?)\s+from\s+)?["']([^"']+)["']/g;

  const requireRegex =
    /require\s*\(\s*["']([^"']+)["']\s*\)/g;

  for (const file of files) {
    const normalizedFilePath =
      normalizePath(file.path);

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
      (match = esImportRegex.exec(
        file.content
      )) !== null
    ) {
      importPaths.push(match[1]);
    }

    while (
      (match = requireRegex.exec(
        file.content
      )) !== null
    ) {
      importPaths.push(match[1]);
    }

    for (const importPath of importPaths) {
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
  // 10. Dependency usage validation
  // =====================================

  const frontendPackage =
    getPackageJson(
      "frontend/package.json"
    );

  const backendPackage =
    getPackageJson(
      "backend/package.json"
    );

  const builtinModules = new Set([
    "fs",
    "fs/promises",
    "path",
    "url",
    "http",
    "https",
    "crypto",
    "events",
    "util",
    "stream",
    "os",
    "child_process",
    "buffer",
    "assert",
    "querystring",
    "string_decoder",
    "timers",
    "zlib",
    "net",
    "tls",
    "dns",
    "module",
  ]);

  for (const file of files) {
    const normalizedPath =
      normalizePath(file.path);

    const isFrontend =
      normalizedPath.startsWith(
        "frontend/"
      );

    const isBackend =
      normalizedPath.startsWith(
        "backend/"
      );

    if (!isFrontend && !isBackend) {
      continue;
    }

    const importMatches = [
      ...file.content.matchAll(
        esImportRegex
      ),
    ].map((match) => match[1]);

    const requireMatches = [
      ...file.content.matchAll(
        requireRegex
      ),
    ].map((match) => match[1]);

    const imports = [
      ...importMatches,
      ...requireMatches,
    ];

    for (const importedPackage of imports) {
      if (
        importedPackage.startsWith(".") ||
        importedPackage.startsWith("@/")
      ) {
        continue;
      }

      const packageName =
        importedPackage.startsWith("@")
          ? importedPackage
              .split("/")
              .slice(0, 2)
              .join("/")
          : importedPackage.split("/")[0];

      if (builtinModules.has(packageName)) {
        continue;
      }

      const targetPackage = isFrontend
        ? frontendPackage
        : backendPackage;

      if (!targetPackage) {
        continue;
      }

      if (
        !dependencyExists(
          targetPackage,
          packageName
        )
      ) {
        errors.push(
          `Missing dependency in ${isFrontend ? "frontend" : "backend"} package.json: ${packageName} used by ${normalizedPath}`
        );
      }
    }
  }

  // =====================================
  // 11. Tailwind validation
  // =====================================

  if (hasFrontend) {
    const indexCss =
      getFile(
        "frontend/src/index.css"
      );

    const viteConfig =
      getFile(
        "frontend/vite.config.js"
      );

    const frontendUsesTailwind =
      Boolean(
        indexCss?.includes(
          '@import "tailwindcss"'
        ) ||
          files.some((file) =>
            /className\s*=/.test(
              file.content
            ) &&
            /\b(bg-|text-|flex|grid|p-|m-|rounded-|border-)/.test(
              file.content
            )
          )
      );

    if (frontendUsesTailwind) {
      if (
        !dependencyExists(
          frontendPackage,
          "tailwindcss"
        )
      ) {
        errors.push(
          "Tailwind CSS is used but tailwindcss is missing from frontend/package.json."
        );
      }

      if (
        !dependencyExists(
          frontendPackage,
          "@tailwindcss/vite"
        )
      ) {
        errors.push(
          "Tailwind CSS v4 is used but @tailwindcss/vite is missing from frontend/package.json."
        );
      }

      if (!indexCss) {
        errors.push(
          "Tailwind is used but frontend/src/index.css is missing."
        );
      } else if (
        !indexCss.includes(
          '@import "tailwindcss"'
        )
      ) {
        warnings.push(
          "Tailwind CSS is used but frontend/src/index.css does not import tailwindcss."
        );
      }

      if (
        viteConfig &&
        !viteConfig.includes(
          "@tailwindcss/vite"
        )
      ) {
        errors.push(
          "Tailwind CSS v4 is used but @tailwindcss/vite is not configured in vite.config.js."
        );
      }

      if (
        indexCss?.includes(
          "shadcn/tailwind.css"
        ) &&
        !dependencyExists(
          frontendPackage,
          "shadcn"
        )
      ) {
        errors.push(
          "index.css imports shadcn/tailwind.css but the shadcn package is not installed."
        );
      }
    }
  }

  // =====================================
  // 12. React Router validation
  // =====================================

  if (hasFrontend) {
    const frontendFiles =
      files.filter((file) =>
        normalizePath(file.path).startsWith(
          "frontend/"
        )
      );

    const usesReactRouter =
      frontendFiles.some((file) =>
        file.content.includes(
          "react-router-dom"
        )
      );

    if (usesReactRouter) {
      if (
        !dependencyExists(
          frontendPackage,
          "react-router-dom"
        )
      ) {
        errors.push(
          "React Router is used but react-router-dom is missing from frontend/package.json."
        );
      }

      const appContent =
        getFile(
          "frontend/src/App.jsx"
        );

      const hasRouter =
        frontendFiles.some(
          (file) =>
            file.content.includes(
              "BrowserRouter"
            ) ||
            file.content.includes(
              "createBrowserRouter"
            ) ||
            file.content.includes(
              "RouterProvider"
            )
        );

      if (!hasRouter) {
        errors.push(
          "React Router APIs are used but no BrowserRouter/createBrowserRouter/RouterProvider configuration was found."
        );
      }

      if (
        appContent &&
        (appContent.includes(
          "useNavigate("
        ) ||
          appContent.includes(
            "useLocation("
          ) ||
          appContent.includes(
            "<Link"
          )) &&
        !hasRouter
      ) {
        errors.push(
          "App uses React Router APIs without a Router provider."
        );
      }
    }
  }

  // =====================================
  // 13. API route consistency
  // =====================================

  // Checked by validators/apiContractValidator.js

  // =====================================
  // 14. Auth dependency validation
  // =====================================

  if (hasBackend) {
    const backendFiles =
      files.filter((file) =>
        normalizePath(file.path).startsWith(
          "backend/"
        )
      );

    const backendUsesJWT =
      backendFiles.some((file) =>
        file.content.includes(
          "jsonwebtoken"
        )
      );

    if (backendUsesJWT) {
      if (
        !dependencyExists(
          backendPackage,
          "jsonwebtoken"
        )
      ) {
        errors.push(
          "jsonwebtoken is used by backend code but is missing from backend/package.json."
        );
      }
    }

    const backendUsesBcrypt =
      backendFiles.some(
        (file) =>
          file.content.includes(
            'require("bcrypt")'
          ) ||
          file.content.includes(
            'require("bcryptjs")'
          ) ||
          file.content.includes(
            'from "bcrypt"'
          ) ||
          file.content.includes(
            'from "bcryptjs"'
          )
      );

    if (backendUsesBcrypt) {
      const hasBcrypt =
        dependencyExists(
          backendPackage,
          "bcrypt"
        ) ||
        dependencyExists(
          backendPackage,
          "bcryptjs"
        );

      if (!hasBcrypt) {
        errors.push(
          "bcrypt/bcryptjs is used by backend code but the dependency is missing from backend/package.json."
        );
      }
    }
  }

  // =====================================
// 15. Route → Controller export validation
// =====================================

for (const file of files) {
  const normalizedPath = normalizePath(file.path);

  if (!normalizedPath.startsWith("backend/routes/")) {
    continue;
  }

  const content = file.content;

  // -------------------------------------
  // Find CommonJS controller imports
  // Example:
  //
  // const {
  //   getAllPatients,
  //   createPatient
  // } = require("../controllers/patientController");
  // -------------------------------------

  const commonJSMatches = [
    ...content.matchAll(
      /(?:const|let|var)\s*\{([\s\S]*?)\}\s*=\s*require\s*\(\s*["']([^"']+)["']\s*\)/g
    ),
  ];

  // -------------------------------------
  // Find ES Module controller imports
  // Example:
  //
  // import {
  //   getAllPatients,
  //   createPatient
  // } from "../controllers/patientController";
  // -------------------------------------

  const esModuleMatches = [
    ...content.matchAll(
      /import\s*\{([\s\S]*?)\}\s*from\s*["']([^"']+)["']/g
    ),
  ];

  const controllerImports = [
    ...commonJSMatches.map((match) => ({
      names: match[1],
      importPath: match[2],
    })),
    ...esModuleMatches.map((match) => ({
      names: match[1],
      importPath: match[2],
    })),
  ];

  // -------------------------------------
  // Validate each controller import
  // -------------------------------------

  for (const { names, importPath } of controllerImports) {
    // Only controller imports
    if (!importPath.includes("controller")) {
      continue;
    }

    // -------------------------------------
    // Resolve controller path
    // -------------------------------------

    const controllerPath = path.posix.normalize(
      path.posix.join(
        path.posix.dirname(normalizedPath),
        importPath
      )
    );

    const possibleControllerPaths = [
      controllerPath,
      `${controllerPath}.js`,
      `${controllerPath}.jsx`,
      `${controllerPath}.ts`,
      `${controllerPath}.tsx`,
    ];

    const actualControllerPath =
      possibleControllerPaths.find((possiblePath) =>
        filePathSet.has(possiblePath)
      );

    // Controller file missing
    if (!actualControllerPath) {
      errors.push(
        `Route imports missing controller: ${normalizedPath} → ${importPath}`
      );
      continue;
    }

    const controllerContent = getFile(actualControllerPath);

    if (!controllerContent) {
      continue;
    }

    // -------------------------------------
    // Extract imported function names
    // -------------------------------------

    const importedFunctions = names
      .split(",")
      .map((name) => {
        return name
          .trim()
          .split(/\s+as\s+/)[0]
          .split("=")[0]
          .trim();
      })
      .filter(Boolean);

    // -------------------------------------
    // Validate every imported function
    // -------------------------------------

    for (const functionName of importedFunctions) {
      const escapedFunctionName = functionName.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const isExported =
        // exports.functionName = ...
        new RegExp(
          `exports\\.${escapedFunctionName}\\s*=`
        ).test(controllerContent) ||

        // module.exports = { functionName, ... }
        new RegExp(
          `module\\.exports\\s*=\\s*\\{[\\s\\S]*\\b${escapedFunctionName}\\b`
        ).test(controllerContent) ||

        // export const functionName
        // export let functionName
        // export var functionName
        // export function functionName
        // export async function functionName
        new RegExp(
          `export\\s+(?:(?:async)\\s+)?(?:const|let|var|function)\\s+${escapedFunctionName}\\b`
        ).test(controllerContent);

      if (!isExported) {
        errors.push(
          `Route/controller mismatch: ${normalizedPath} imports "${functionName}", but ${actualControllerPath} does not export "${functionName}".`
        );
      }
    }
  }
}
  // =====================================
// 16. Frontend Navigation → React Route validation
// =====================================

if (hasFrontend) {
  const appContent = getFile(
    "frontend/src/App.jsx"
  );

  if (appContent) {
    // -------------------------------------
    // Extract routes declared in App.jsx
    // Example:
    // <Route path="/patients" element={<Patients />} />
    // -------------------------------------

    const declaredRoutes = new Set();

    const routeRegex =
      /<Route[\s\S]*?path\s*=\s*["']([^"']+)["']/g;

    for (const match of appContent.matchAll(
      routeRegex
    )) {
      declaredRoutes.add(match[1]);
    }

    // Always consider root route if "/" exists
    // through explicit Route declaration.
    
    // -------------------------------------
    // Find frontend navigation targets
    // -------------------------------------

    const navigationTargets = [];

    for (const file of files) {
      const normalizedPath =
        normalizePath(file.path);

      if (!normalizedPath.startsWith("frontend/")) {
        continue;
      }

      const content = file.content;

      // <Link to="/patients">
      const linkRegex =
        /<Link[\s\S]*?to\s*=\s*["']([^"']+)["']/g;

      for (const match of content.matchAll(
        linkRegex
      )) {
        navigationTargets.push({
          path: match[1],
          file: normalizedPath,
          type: "Link",
        });
      }

      // navigate("/patients")
      const navigateRegex =
        /navigate\s*\(\s*["']([^"']+)["']/g;

      for (const match of content.matchAll(
        navigateRegex
      )) {
        navigationTargets.push({
          path: match[1],
          file: normalizedPath,
          type: "navigate",
        });
      }

      // <Navigate to="/login" />
      const redirectRegex =
        /<Navigate[\s\S]*?to\s*=\s*["']([^"']+)["']/g;

      for (const match of content.matchAll(
        redirectRegex
      )) {
        navigationTargets.push({
          path: match[1],
          file: normalizedPath,
          type: "Navigate",
        });
      }
    }

    // -------------------------------------
    // Compare navigation targets with routes
    // -------------------------------------

    for (const navigation of navigationTargets) {
      const targetPath = navigation.path;

      // Ignore external URLs
      if (
        targetPath.startsWith("http://") ||
        targetPath.startsWith("https://") ||
        targetPath.startsWith("#")
      ) {
        continue;
      }

      // Ignore dynamic/template navigation
      if (
        targetPath.includes("${") ||
        targetPath.includes("`")
      ) {
        continue;
      }

      // -------------------------------------
      // Exact route match
      // -------------------------------------

      let routeExists =
        declaredRoutes.has(targetPath);

      // -------------------------------------
      // Dynamic route support
      // Example:
      // App.jsx → /projects/:id
      // Link → /projects/123
      // -------------------------------------

      if (!routeExists) {
        for (const declaredRoute of declaredRoutes) {
          const routePattern = new RegExp(
            "^" +
              declaredRoute
                .replace(
                  /:[^/]+/g,
                  "[^/]+"
                )
                .replace(
                  /\*/g,
                  ".*"
                ) +
              "$"
          );

          if (routePattern.test(targetPath)) {
            routeExists = true;
            break;
          }
        }
      }

      if (!routeExists) {
        errors.push(
          `Frontend navigation mismatch: ${navigation.file} uses ${navigation.type} to "${targetPath}", but no matching React route is declared in frontend/src/App.jsx.`
        );
      }
    }
  }
}


  // =====================================
  // 16. Model → Method consistency
  // =====================================

  const modelMethods = new Map();

  for (const file of files) {
    const normalizedPath =
      normalizePath(file.path);

    if (
      !normalizedPath.includes(
        "/models/"
      )
    ) {
      continue;
    }

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

    modelMethods.set(
      modelNameMatch[1],
      methods
    );
  }

  for (const file of files) {
    const normalizedPath =
      normalizePath(file.path);

    const isControllerOrService =
      normalizedPath.includes(
        "/controllers/"
      ) ||
      normalizedPath.includes(
        "/services/"
      );

    if (!isControllerOrService) {
      continue;
    }

    const modelImports = [
      ...file.content.matchAll(
        /(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(\s*["'][^"']*\/models\/(\w+)["']\s*\)/g
      ),
    ];

    for (const match of modelImports) {
      const modelVariable = match[1];
      const modelName = match[2];

      const allowedMethods =
        modelMethods.get(
          modelName
        ) || [];

      const documentQueryRegex =
        new RegExp(
          `(?:const|let|var)\\s+(\\w+)\\s*=\\s*await\\s+${modelVariable}\\.(findOne|findById|findByIdAndUpdate|findByIdAndDelete|findOneAndUpdate|findOneAndDelete)\\s*\\(`,
          "g"
        );

      const documentVariables = [
        ...file.content.matchAll(
          documentQueryRegex
        ),
      ].map(
        (match) => match[1]
      );

      for (const documentVariable of documentVariables) {
        const methodCallRegex =
          new RegExp(
            `\\b${documentVariable}\\.(\\w+)\\s*\\(`,
            "g"
          );

        const methodCalls = [
          ...file.content.matchAll(
            methodCallRegex
          ),
        ];

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

        for (const methodMatch of methodCalls) {
          const methodName =
            methodMatch[1];

          if (
            ignoredMethods.includes(
              methodName
            )
          ) {
            continue;
          }

          if (
            !allowedMethods.includes(
              methodName
            )
          ) {
            errors.push(
              `Model method mismatch in ${normalizedPath}: "${documentVariable}.${methodName}()" is used, but ${modelName} model does not define schema.methods.${methodName}().`
            );
          }
        }
      }
    }
  }

  // =====================================
  // 21. Docker runtime validation
  // =====================================

  if (hasBackend) {
    const backendFiles =
      files.filter((file) =>
        normalizePath(file.path).startsWith(
          "backend/"
        )
      );

    const backendServer =
      getFile(
        "backend/server.js"
      );

    if (backendServer) {
      if (
        !backendServer.includes(
          "process.env.PORT"
        )
      ) {
        warnings.push(
          "backend/server.js does not appear to use process.env.PORT."
        );
      }

      if (
        !backendServer.includes(
          "0.0.0.0"
        )
      ) {
        warnings.push(
          "Backend may not be explicitly bound to 0.0.0.0 for Docker."
        );
      }
    }

    const viteConfig =
      getFile(
        "frontend/vite.config.js"
      );

    if (hasFrontend && viteConfig) {
      if (
        !viteConfig.includes(
          "0.0.0.0"
        )
      ) {
        warnings.push(
          "Vite server may not be configured for Docker host access."
        );
      }

      if (
        viteConfig.includes(
          '"/api"'
        ) &&
        !viteConfig.includes(
          "5001"
        )
      ) {
        warnings.push(
          "Frontend /api proxy does not appear to target backend port 5001."
        );
      }
    }
  }

  // =====================================
  // 22. Environment variable validation
  // =====================================

  if (hasBackend) {
    const envExample =
      getFile(
        "backend/.env.example"
      );

    const backendFiles =
      files.filter((file) =>
        normalizePath(file.path).startsWith(
          "backend/"
        )
      );

    const envVariables = new Set();

    for (const file of backendFiles) {
      const matches = [
        ...file.content.matchAll(
          /process\.env\.([A-Z0-9_]+)/g
        ),
      ];

      for (const match of matches) {
        envVariables.add(
          match[1]
        );
      }
    }

    if (
      envVariables.size > 0 &&
      !envExample
    ) {
      warnings.push(
        "Backend uses environment variables but backend/.env.example is missing."
      );
    }

    if (envExample) {
      for (const variable of envVariables) {
        if (
          !envExample.includes(
            variable
          )
        ) {
          warnings.push(
            `Environment variable ${variable} is used but not documented in backend/.env.example.`
          );
        }
      }
    }
  }

  

  // =====================================
  // 23. Final result
  // =====================================

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totalFiles: files.length,
  };
};

export default validateProject;