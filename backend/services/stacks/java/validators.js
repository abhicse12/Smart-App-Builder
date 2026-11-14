// Static checks for Java full-stack projects (Spring Boot + React). The Maven
// build, Docker and the auth test are the final check; these catch common
// problems early, with messages the Fixer can act on.

import { extractFrontendCalls } from "../../validators/apiContractValidator.js";
import validateModuleExports from "../../validators/moduleExportsValidator.js";
import { LOCKED_PATHS } from "./templates.js";

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");

const JAVA_ROOT = "backend/src/main/java/";

const ALLOWED_JAVA_IMPORTS = [
  "java.",
  "jakarta.validation.",
  "org.springframework.web.",
  "org.springframework.http.",
  "org.springframework.stereotype.",
  "org.springframework.beans.",
  "org.springframework.format.",
  "org.springframework.security.core.annotation.",
  "com.fasterxml.jackson.",
  "org.slf4j.",
  "com.app.",
];

const ALLOWED_JS_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-router-dom",
  "axios",
  "lucide-react",
]);

const stripJavaComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/* =========================================================
   SPRING ROUTES
========================================================= */

const joinPaths = (prefix, route) =>
  `/${`${prefix}/${route}`.split("/").filter(Boolean).join("/")}`;

const CONTROLLER_FILE =
  /^backend\/src\/main\/java\/com\/app\/(controllers|auth)\/\w+\.java$/;

const classPrefix = (code) =>
  code.match(
    /@RequestMapping\s*\(\s*(?:(?:value|path)\s*=\s*)?\{?\s*"([^"]*)"/
  )?.[1] || "";

// [{ method, path, file }] of every controller
export const extractSpringEndpoints = (files = []) => {
  const endpoints = [];

  for (const file of files) {
    const filePath = normalizePath(file?.path);

    if (!CONTROLLER_FILE.test(filePath)) {
      continue;
    }

    const code = stripJavaComments(file.content || "");
    const prefix = classPrefix(code);

    for (const match of code.matchAll(
      /@(Get|Post|Put|Patch|Delete)Mapping\b(?:\s*\(\s*(?:(?:value|path)\s*=\s*)?\{?\s*"([^"]*)")?/g
    )) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: joinPaths(prefix, match[2] || ""),
        file: filePath,
      });
    }
  }

  return endpoints;
};

// /api/tasks/{id} matches /api/tasks/${task._id} and /api/tasks/:id
const routesMatch = (route, called) => {
  const routeParts = route.split("/").filter(Boolean);
  const calledParts = called.split("?")[0].split("/").filter(Boolean);

  return (
    routeParts.length === calledParts.length &&
    routeParts.every(
      (part, index) =>
        /^\{.*\}$/.test(part) ||
        /\$\{|^:/.test(calledParts[index]) ||
        part === calledParts[index]
    )
  );
};

/* =========================================================
   MODULE SUMMARY FOR THE CODER
========================================================= */

// Exact names and signatures, so files of later batches compile against them
export const summarizeJavaTypes = (files = []) =>
  files
    .filter((file) => normalizePath(file?.path).endsWith(".java"))
    .map((file) => {
      const code = stripJavaComments(file.content || "");
      const packageName = code.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1] || "";

      const declarations = [
        ...code.matchAll(
          /^\s*public\s+(?:static\s+|final\s+|abstract\s+)*(?:(?:class|interface|enum)\s+\w+|record\s+\w+\s*\([^)]*\)|[\w<>[\],.?\s]+?\s\w+\s*\([^)]*\))/gm
        ),
      ].map((match) => match[0].replace(/\s+/g, " ").trim());

      return `${normalizePath(file.path)} (package ${packageName}): ${declarations.join("; ")}`;
    });

/* =========================================================
   JAVA SOURCES
========================================================= */

// Does a com.app import point at a real file? Nested types and static imports
// name something inside the class, so any leading part of the name may match.
const appImportExists = (name, paths) => {
  const parts = name.replace(/\.\*$/, "").split(".");

  for (let length = parts.length; length >= 2; length--) {
    const base = `${JAVA_ROOT}${parts.slice(0, length).join("/")}`;

    if (
      paths.has(`${base}.java`) ||
      (name.endsWith(".*") &&
        length === parts.length &&
        [...paths].some((filePath) => filePath.startsWith(`${base}/`)))
    ) {
      return true;
    }
  }

  return false;
};

const validateJavaSources = ({ javaFiles, paths, errors, warnings }) => {
  const typeOwners = new Map();

  for (const file of javaFiles) {
    const filePath = normalizePath(file.path);
    const locked = LOCKED_PATHS.includes(filePath);
    const code = stripJavaComments(file.content || "");
    const typeName = filePath.split("/").pop().replace(/\.java$/, "");

    if (typeOwners.has(typeName)) {
      errors.push(
        `${filePath} and ${typeOwners.get(typeName)} both define ${typeName}. Class names must be unique across the project.`
      );
    }

    typeOwners.set(typeName, filePath);

    // The fixed files are tested
    if (locked) {
      continue;
    }

    const expectedPackage = filePath
      .slice(JAVA_ROOT.length)
      .split("/")
      .slice(0, -1)
      .join(".");

    if (code.match(/^\s*package\s+([\w.]+)\s*;/m)?.[1] !== expectedPackage) {
      errors.push(`${filePath} must start with: package ${expectedPackage};`);
    }

    const publicType = code.match(
      /\bpublic\s+(?:final\s+|abstract\s+|sealed\s+|non-sealed\s+)*(?:class|record|enum|interface|@interface)\s+(\w+)/
    )?.[1];

    if (publicType !== typeName) {
      errors.push(`${filePath} must declare the public type ${typeName} (the file name), found ${publicType || "none"}.`);
    }

    for (const match of code.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+(?:\.\*)?)\s*;/gm)) {
      const name = match[1];

      if (!ALLOWED_JAVA_IMPORTS.some((prefix) => name.startsWith(prefix))) {
        errors.push(
          `${filePath} imports ${name}, which is not available. pom.xml is fixed and data is stored with JsonCollection, so use only java.*, jakarta.validation.*, the Spring web classes and com.app.* classes.`
        );
      } else if (name.startsWith("com.app.") && !appImportExists(name, paths)) {
        errors.push(`${filePath} imports ${name}, but that class does not exist.`);
      }
    }

    if (/new\s+JsonCollection\s*\(\s*"users"\s*\)|users\.json/.test(code)) {
      errors.push(`${filePath} must not use the "users" collection: accounts belong to the fixed authentication code.`);
    }

    if (/\.map\s*\(\s*\(?\w*\)?\s*->\s*(?:\([^)]*\)\s*)?Map\.of\b/.test(code)) {
      errors.push(
        `${filePath} uses .map(x -> Map.of(...)), which does not compile as Map<String, Object>. Store the result of .orElseThrow(...) in a Map<String, Object> variable, then return Map.of("key", variable).`
      );
    }

    const isController = /@(Rest)?Controller\b/.test(code);
    const inControllers = /\/com\/app\/controllers\//.test(filePath);

    if (isController && !inControllers) {
      errors.push(`${filePath}: controllers belong in com.app.controllers.`);
    }

    if (!inControllers) {
      continue;
    }

    if (!/@RestController\b/.test(code)) {
      errors.push(`${filePath} must be annotated with @RestController.`);
      continue;
    }

    const prefix = classPrefix(code);

    if (!prefix.startsWith("/api/")) {
      errors.push(`${filePath} must have @RequestMapping("/api/...") on the class because only /api reaches the backend.`);
    } else if (/^\/api\/auth(\/|$)/.test(prefix)) {
      errors.push(`${filePath} must not use /api/auth: those routes belong to the fixed authentication code.`);
    }

    if (/@RequestMapping\s*\([^)]*method\s*=/.test(code)) {
      errors.push(`${filePath}: use @GetMapping, @PostMapping and so on instead of @RequestMapping(method = ...).`);
    }

    if (/@\w+Mapping\s*\(\s*(?:(?:value|path)\s*=\s*)?\{?\s*"[^"]*\/"/.test(code.replace(/"\/"/g, '""'))) {
      errors.push(`${filePath}: route strings must not end in "/", because Spring treats that as a different path.`);
    }

    if (!prefix.startsWith("/api/public") && !/AuthUser/.test(code)) {
      warnings.push(`${filePath} does not use the logged-in user (AuthUser).`);
    }

    if (/\b(Files|FileWriter|FileReader|FileOutputStream)\b|new\s+File\s*\(/.test(code)) {
      warnings.push(`${filePath} seems to access files directly; data belongs in JsonCollection.`);
    }
  }
};

/* =========================================================
   VALIDATION
========================================================= */

const validateJavaProject = ({ files = [], errors = [], warnings = [] }) => {
  const paths = new Set(files.map((file) => normalizePath(file?.path)));
  const contents = new Map(
    files.map((file) => [normalizePath(file?.path), String(file?.content ?? "")])
  );

  for (const lockedPath of LOCKED_PATHS) {
    if (!paths.has(lockedPath)) {
      errors.push(`Required project file is missing: ${lockedPath}`);
    }
  }

  const javaFiles = files.filter((file) => normalizePath(file?.path).endsWith(".java"));

  validateJavaSources({ javaFiles, paths, errors, warnings });

  // Seed data files
  for (const [filePath, content] of contents) {
    if (!/^backend\/data\/[^/]+\.json$/.test(filePath)) {
      continue;
    }

    try {
      if (!Array.isArray(JSON.parse(content))) {
        errors.push(`${filePath} must contain a JSON array.`);
      }
    } catch {
      errors.push(`${filePath} is not valid JSON.`);
    }
  }

  // Duplicate routes stop Spring from starting
  const endpoints = extractSpringEndpoints(files);
  const seenRoutes = new Set();

  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path.replace(/\{[^}]*\}/g, "{}")}`;

    if (seenRoutes.has(key)) {
      errors.push(`${endpoint.file}: ${endpoint.method} ${endpoint.path} is defined more than once.`);
    }

    seenRoutes.add(key);
  }

  // Frontend calls <-> Spring routes

  for (const call of extractFrontendCalls(files)) {
    if (call.absolute) {
      errors.push(`${call.file} calls the full URL ${call.url}. Use the api client with a path such as "/tasks".`);
      continue;
    }

    if (!call.fullPath) {
      continue;
    }

    if (!call.fullPath.startsWith("/api")) {
      errors.push(`${call.file} calls ${call.method} ${call.fullPath}. Use the api client: only /api reaches the backend.`);
      continue;
    }

    if (
      !endpoints.some(
        (endpoint) =>
          endpoint.method === call.method &&
          routesMatch(endpoint.path, call.fullPath)
      )
    ) {
      errors.push(
        `${call.file} calls ${call.method} ${call.fullPath}, but no Spring route matches it. Backend routes: ${endpoints
          .map((endpoint) => `${endpoint.method} ${endpoint.path}`)
          .join(", ")}`
      );
    }
  }

  // extractFrontendCalls drops a trailing slash, but Spring answers it with 404
  for (const [filePath, content] of contents) {
    if (!/^frontend\/src\/.+\.jsx?$/.test(filePath)) {
      continue;
    }

    for (const match of content.matchAll(
      /\bapi\s*\.\s*(?:get|post|put|patch|delete)\s*\(\s*["'`]([^"'`?]*\/)(?:\?[^"'`]*)?["'`]/g
    )) {
      errors.push(
        `${filePath} calls ${match[1]} with a trailing slash, which Spring does not match. Remove the final "/".`
      );
    }
  }

  // Frontend imports
  for (const [filePath, content] of contents) {
    if (!/^frontend\/src\/.+\.jsx?$/.test(filePath)) {
      continue;
    }

    for (const match of content.matchAll(
      /(?:^|\n)\s*import\s+(?:[^"'\n]+\s+from\s+)?["']([^"']+)["']/g
    )) {
      const specifier = match[1];

      if (specifier.startsWith(".")) {
        const baseParts = filePath.split("/").slice(0, -1);

        for (const part of specifier.split("/")) {
          if (part === "..") baseParts.pop();
          else if (part !== ".") baseParts.push(part);
        }

        const base = baseParts.join("/");

        if (
          !["", ".js", ".jsx", ".css", "/index.js", "/index.jsx"].some((ending) =>
            paths.has(`${base}${ending}`)
          )
        ) {
          errors.push(`${filePath} imports ${specifier}, but that file does not exist.`);
        }

        continue;
      }

      const packageName = specifier.split("/")[0];

      if (!ALLOWED_JS_PACKAGES.has(packageName)) {
        errors.push(
          `${filePath} imports "${packageName}", which is not installed. Allowed packages: ${[...ALLOWED_JS_PACKAGES].join(", ")}.`
        );
      }
    }
  }

  validateModuleExports({ files, errors, warnings });

  // App routes
  const appCode = contents.get("frontend/src/App.jsx");

  if (appCode === undefined) {
    errors.push("frontend/src/App.jsx is missing.");
  } else {
    for (const route of ["/login", "/signup", "/"]) {
      if (!new RegExp(`path\\s*=\\s*\\{?["'\`]${route}["'\`]`).test(appCode)) {
        errors.push(`frontend/src/App.jsx has no route for "${route}".`);
      }
    }

    if (!/ProtectedRoute/.test(appCode)) {
      errors.push("frontend/src/App.jsx must wrap private pages in <ProtectedRoute>.");
    }

    if (/BrowserRouter|AuthProvider/.test(appCode)) {
      errors.push("frontend/src/App.jsx must not use BrowserRouter or AuthProvider: main.jsx already provides them.");
    }
  }

  const frontendCode = [...contents]
    .filter(([filePath]) => /^frontend\/src\/(pages|components)\//.test(filePath))
    .map(([, content]) => content);

  if (!frontendCode.some((content) => /\blogout\b/.test(content))) {
    errors.push("No page or component offers logout: add a visible button that calls logout() from useAuth().");
  }
};

export default validateJavaProject;
