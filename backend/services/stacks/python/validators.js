// Static checks for Python full-stack projects (FastAPI + React). Docker and
// the auth test are the final check; these catch common problems early, with
// messages the Fixer can act on.

import { extractFrontendCalls } from "../../validators/apiContractValidator.js";
import validateModuleExports from "../../validators/moduleExportsValidator.js";
import { LOCKED_PATHS } from "./templates.js";

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/").replace(/^\.\//, "");

const ALLOWED_PY_PACKAGES = new Set(["app", "fastapi", "pydantic", "starlette"]);

const ALLOWED_JS_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-router-dom",
  "axios",
  "lucide-react",
]);

// Python 3.12 standard library modules a web app may use
const PY_STDLIB = new Set(
  `__future__ abc argparse array ast asyncio base64 bisect calendar cmath codecs
  collections concurrent contextlib copy csv dataclasses datetime decimal
  difflib email enum fnmatch fractions functools glob hashlib heapq hmac html
  http importlib io itertools json locale logging math mimetypes numbers operator os pathlib
  pickle pkgutil platform pprint queue random re secrets shutil signal statistics
  string struct sys tempfile textwrap threading time timeit traceback types
  typing unicodedata urllib uuid warnings weakref zlib zoneinfo`.split(/\s+/)
);

const stripPyComments = (code = "") =>
  code
    .replace(/("""|''')[\s\S]*?\1/g, "")
    .replace(/^\s*#.*$/gm, "");

/* =========================================================
   FASTAPI ROUTES
========================================================= */

const joinPaths = (prefix, route) =>
  `/${`${prefix}/${route}`.split("/").filter(Boolean).join("/")}`;

// [{ method, path }] of every router in backend/app/routers
export const extractFastApiEndpoints = (files = []) => {
  const endpoints = [];

  for (const file of files) {
    if (!/^backend\/app\/routers\/[\w-]+\.py$/.test(normalizePath(file?.path))) {
      continue;
    }

    const code = stripPyComments(file.content || "");
    const prefix =
      code.match(/APIRouter\s*\([^)]*prefix\s*=\s*["']([^"']*)["']/)?.[1] || "";

    for (const match of code.matchAll(
      /@\w+\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["']([^"']*)["']/g
    )) {
      endpoints.push({
        method: match[1].toUpperCase(),
        path: joinPaths(prefix, match[2]),
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
   PYTHON IMPORTS
========================================================= */

const moduleFile = (moduleName, paths) => {
  const base = `backend/${moduleName.split(".").join("/")}`;

  return paths.has(`${base}.py`)
    ? `${base}.py`
    : paths.has(`${base}/__init__.py`)
      ? `${base}/__init__.py`
      : null;
};

const isPackage = (moduleName, paths) =>
  [...paths].some((filePath) =>
    filePath.startsWith(`backend/${moduleName.split(".").join("/")}/`)
  );

// Names defined at the top level of a Python file
const topLevelNames = (code) =>
  new Set([
    ...[...code.matchAll(/^(?:async\s+def|def|class)\s+(\w+)/gm)].map((m) => m[1]),
    ...[...code.matchAll(/^(\w+)\s*(?::[^=\n]+)?=/gm)].map((m) => m[1]),
    ...[...code.matchAll(/^from\s+\S+\s+import\s+(.+)$/gm)].flatMap((m) =>
      m[1].split(",").map((name) => name.trim().split(/\s+as\s+/).pop())
    ),
    ...[...code.matchAll(/^import\s+(\S+)(?:\s+as\s+(\w+))?/gm)].map(
      (m) => m[2] || m[1].split(".")[0]
    ),
  ]);

const parseImportedNames = (text) =>
  text
    .replace(/[()]/g, " ")
    .split(",")
    .map((name) => name.trim().split(/\s+as\s+/)[0].trim())
    .filter(Boolean);

const validatePythonImports = ({ pyFiles, paths, contents, errors }) => {
  for (const file of pyFiles) {
    const filePath = normalizePath(file.path);
    const code = stripPyComments(file.content || "");

    const checkPackage = (root) => {
      // The fixed files are tested and may use their own packages
      if (LOCKED_PATHS.includes(filePath)) {
        return;
      }

      if (!ALLOWED_PY_PACKAGES.has(root) && !PY_STDLIB.has(root)) {
        errors.push(
          `${filePath} imports "${root}", which is not installed. backend/requirements.txt is fixed: use only the Python standard library, fastapi, pydantic and app.* modules.`
        );
      }
    };

    for (const match of code.matchAll(/^\s*import\s+([\w.]+)/gm)) {
      const root = match[1].split(".")[0];
      checkPackage(root);

      if (root === "app" && !moduleFile(match[1], paths) && !isPackage(match[1], paths)) {
        errors.push(`${filePath} imports ${match[1]}, but that module does not exist.`);
      }
    }

    for (const match of code.matchAll(
      /^\s*from\s+(\.*[\w.]*)\s+import\s+(\([^)]*\)|[^\n]+)/gm
    )) {
      let moduleName = match[1];

      if (moduleName.startsWith(".")) {
        const dots = moduleName.match(/^\.+/)[0].length;
        const parents = filePath.replace(/^backend\//, "").split("/").slice(0, -dots);
        moduleName = [...parents, moduleName.slice(dots)].filter(Boolean).join(".");
      }

      const root = moduleName.split(".")[0];
      checkPackage(root);

      if (root !== "app") {
        continue;
      }

      const target = moduleFile(moduleName, paths);

      if (!target && !isPackage(moduleName, paths)) {
        errors.push(
          `${filePath} imports from ${moduleName}, but backend/${moduleName.split(".").join("/")}.py does not exist.`
        );
        continue;
      }

      const defined = target ? topLevelNames(stripPyComments(contents.get(target))) : new Set();

      for (const name of parseImportedNames(match[2])) {
        if (
          name !== "*" &&
          !defined.has(name) &&
          !moduleFile(`${moduleName}.${name}`, paths)
        ) {
          errors.push(
            `${filePath} imports ${name} from ${moduleName}, but ${target || `the ${moduleName} package`} does not define ${name}.`
          );
        }
      }
    }
  }
};

/* =========================================================
   VALIDATION
========================================================= */

const validatePythonProject = ({ files = [], errors = [], warnings = [] }) => {
  const paths = new Set(files.map((file) => normalizePath(file?.path)));
  const contents = new Map(
    files.map((file) => [normalizePath(file?.path), String(file?.content ?? "")])
  );

  for (const lockedPath of LOCKED_PATHS) {
    if (!paths.has(lockedPath)) {
      errors.push(`Required project file is missing: ${lockedPath}`);
    }
  }

  const pyFiles = files.filter((file) => normalizePath(file?.path).endsWith(".py"));

  validatePythonImports({ pyFiles, paths, contents, errors });

  // Routers
  for (const file of pyFiles) {
    const filePath = normalizePath(file.path);

    if (!/^backend\/app\/routers\/[\w-]+\.py$/.test(filePath) || /__init__\.py$/.test(filePath)) {
      continue;
    }

    const code = stripPyComments(file.content || "");

    if (!/^router\s*=\s*APIRouter\s*\(/m.test(code)) {
      errors.push(`${filePath} must define router = APIRouter(prefix="/api/...").`);
    } else if (!/prefix\s*=\s*["']\/api\//.test(code)) {
      errors.push(`${filePath}: the APIRouter prefix must start with /api/ because only /api reaches the backend.`);
    }

    if (
      filePath !== "backend/app/routers/auth.py" &&
      !/get_current_user/.test(code)
    ) {
      warnings.push(`${filePath} has no protected routes (get_current_user is not used).`);
    }
  }

  // Direct use of the accounts file bypasses the auth code
  for (const file of pyFiles) {
    const filePath = normalizePath(file.path);

    if (
      filePath !== "backend/app/dependencies/auth.py" &&
      /JsonCollection\s*\(\s*["']users["']\s*\)/.test(file.content || "")
    ) {
      errors.push(`${filePath} must not use JsonCollection("users"): accounts belong to the fixed authentication code.`);
    }
  }

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

  // Frontend calls <-> FastAPI routes
  const endpoints = extractFastApiEndpoints(files);

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
        `${call.file} calls ${call.method} ${call.fullPath}, but no FastAPI route matches it. Backend routes: ${endpoints
          .map((endpoint) => `${endpoint.method} ${endpoint.path}`)
          .join(", ")}`
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

export default validatePythonProject;
