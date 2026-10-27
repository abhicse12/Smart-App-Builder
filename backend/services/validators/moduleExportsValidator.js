import path from "path";

// Checks that every name imported from a local file is really exported
// by it. Files are generated in separate batches, so a page can import
// { AuthContext } from a context file that only exports AuthProvider and
// useAuth; the browser then refuses the module and renders a white page.

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

// Remove /* */ and // comments ("://" in URLs is kept)
const stripComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const CODE_FILE = /\.(c|m)?(j|t)sx?$/i;

const resolveLocal = (fromFile, specifier, filePathSet) => {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return null;
  }

  const base = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromFile), specifier)
  );

  return (
    [
      base,
      `${base}.js`,
      `${base}.jsx`,
      `${base}.ts`,
      `${base}.tsx`,
      `${base}.mjs`,
      `${base}.cjs`,
      `${base}/index.js`,
      `${base}/index.jsx`,
      `${base}/index.ts`,
      `${base}/index.tsx`,
    ].find((candidate) => filePathSet.has(candidate)) || null
  );
};

// "{ a, b as c, default as d }" -> [{ imported: "a", local: "a" }, ...]
const parseSpecifiers = (list = "") =>
  list
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [imported, local] = part
        .replace(/^type\s+/, "")
        .split(/\s+as\s+|\s*:\s*/)
        .map((name) => name.trim());

      return { imported, local: local || imported };
    })
    .filter(({ imported }) => /^[\w$]+$/.test(imported));

/* =========================================================
   EXPORTS OF A FILE
========================================================= */

export const getModuleExports = (content = "") => {
  const code = stripComments(content);
  const named = new Set();

  let hasDefault = false;
  let unknown = false; // export * / dynamic module.exports: cannot tell

  // ---------- ES modules ----------
  for (const match of code.matchAll(
    /export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([\w$]+)/g
  )) {
    named.add(match[1]);
  }

  // export const { a, b } = obj
  for (const match of code.matchAll(
    /export\s+(?:const|let|var)\s*\{([^}]*)\}\s*=/g
  )) {
    for (const { local } of parseSpecifiers(match[1])) {
      named.add(local);
    }
  }

  // export { a, b as c } (also re-exports: export { x } from "./y")
  for (const match of code.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const { local } of parseSpecifiers(match[1])) {
      if (local === "default") {
        hasDefault = true;
      } else {
        named.add(local);
      }
    }
  }

  if (/export\s+default\b/.test(code)) {
    hasDefault = true;
  }

  if (/export\s*\*\s*(as\s+[\w$]+\s+)?from/.test(code)) {
    unknown = true;
  }

  // ---------- CommonJS ----------
  const isCommonJs = /\bmodule\.exports\b|\bexports\.[\w$]+\s*=/.test(code);

  for (const match of code.matchAll(
    /(?:module\.)?exports\.([\w$]+)\s*=/g
  )) {
    named.add(match[1]);
  }

  // module.exports = { a, b: c, d() {} }
  for (const match of code.matchAll(
    /module\.exports\s*=\s*\{([^}]*)\}/g
  )) {
    for (const part of match[1].split(",")) {
      const key = part.trim().match(/^(?:async\s+)?([\w$]+)/);

      if (key) {
        named.add(key[1]);
      }
    }
  }

  // module.exports = something (function, class, instance): the whole
  // module is the export; destructured names come from its properties
  if (/module\.exports\s*=\s*(?!\{)/.test(code)) {
    hasDefault = true;
    unknown = true;
  }

  if (isCommonJs) {
    hasDefault = true;
  }

  return { named, hasDefault, unknown, isCommonJs };
};

/* =========================================================
   IMPORTS OF A FILE
========================================================= */

const getModuleImports = (content = "") => {
  const code = stripComments(content);
  const imports = [];

  // import Default, { a, b as c } from "./x" / import Default from "./x" / import { a } from "./x"
  for (const match of code.matchAll(
    /import\s+(?!type\b)([\w$]+)?\s*,?\s*(?:\{([^}]*)\})?\s*from\s*["']([^"']+)["']/g
  )) {
    if (!match[1] && match[2] === undefined) {
      continue;
    }

    imports.push({
      specifier: match[3],
      defaultName: match[1] || null,
      named: match[2] !== undefined ? parseSpecifiers(match[2]) : [],
      kind: "esm",
    });
  }

  // const { a, b: c } = require("./x")
  for (const match of code.matchAll(
    /(?:const|let|var)\s*\{([^}]*)\}\s*=\s*require\(\s*["']([^"']+)["']\s*\)/g
  )) {
    imports.push({
      specifier: match[2],
      defaultName: null,
      named: parseSpecifiers(match[1]),
      kind: "cjs",
    });
  }

  return imports;
};

/* =========================================================
   VALIDATION
========================================================= */

const validateModuleExports = ({
  files = [],
  errors = [],
}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const codeFiles = files.filter((file) =>
    CODE_FILE.test(normalizePath(file?.path))
  );

  const filePathSet = new Set(
    files.map((file) => normalizePath(file?.path))
  );

  const exportsByFile = new Map(
    codeFiles.map((file) => [
      normalizePath(file.path),
      getModuleExports(file.content || ""),
    ])
  );

  for (const file of codeFiles) {
    const filePath = normalizePath(file.path);

    for (const entry of getModuleImports(file.content || "")) {
      const target = resolveLocal(filePath, entry.specifier, filePathSet);
      const exported = target && exportsByFile.get(target);

      // Missing files are reported by the import validator
      if (!exported) {
        continue;
      }

      const available = [
        ...exported.named,
        ...(exported.hasDefault ? ["default"] : []),
      ];

      const describe = () =>
        available.length > 0 ? available.join(", ") : "nothing";

      if (
        entry.kind === "esm" &&
        entry.defaultName &&
        !exported.hasDefault &&
        !exported.unknown
      ) {
        errors.push(
          `Import/export mismatch in ${filePath}: "import ${entry.defaultName} from '${entry.specifier}'" uses a default export, but ${target} has no default export (it exports: ${describe()}). The browser/Node refuses to load the module.`
        );
      }

      if (exported.unknown) {
        continue;
      }

      for (const { imported } of entry.named) {
        if (imported === "default") {
          continue;
        }

        if (!exported.named.has(imported)) {
          errors.push(
            `Import/export mismatch in ${filePath}: it imports { ${imported} } from '${entry.specifier}', but ${target} does not export ${imported} (it exports: ${describe()}). Either export ${imported} from ${target} or import one of its real exports.`
          );
        }
      }
    }
  }
};

// One line per already-generated module: "path exports: a, b (default)".
// Given to later Coder batches so they import names that really exist.
export const summarizeExports = (files = []) =>
  files
    .filter((file) => CODE_FILE.test(normalizePath(file?.path)))
    .map((file) => {
      const { named, hasDefault } = getModuleExports(file.content || "");
      const names = [...named];

      if (hasDefault) {
        names.push("default");
      }

      return names.length > 0
        ? `${normalizePath(file.path)} exports: ${names.join(", ")}`
        : null;
    })
    .filter(Boolean);

export default validateModuleExports;
