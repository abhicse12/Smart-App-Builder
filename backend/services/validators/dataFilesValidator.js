import { extractFrontendCalls } from "./apiContractValidator.js";

// JSON data files used by the demo backend (backend/data/*.json):
// - they must be valid JSON (a truncated "[" silently reads as [])
// - a collection the frontend only reads (e.g. a product catalog) must
//   ship seed records, otherwise the app shows an empty page and the
//   user has no way to add items

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

const isDataFile = (filePath) =>
  /^(backend\/)?data\/[^/]+\.json$/i.test(filePath);

const validateDataFiles = ({
  files = [],
  errors = [],
}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const dataFiles = files.filter((file) =>
    isDataFile(normalizePath(file?.path))
  );

  if (dataFiles.length === 0) {
    return;
  }

  const calls = extractFrontendCalls(files);

  for (const file of dataFiles) {
    const filePath = normalizePath(file.path);
    let data;

    try {
      data = JSON.parse(file.content || "");
    } catch (error) {
      errors.push(
        `${filePath} is not valid JSON (${error.message}). It must be a complete JSON array, e.g. [] or an array of seed records.`
      );
      continue;
    }

    if (!Array.isArray(data) || data.length > 0) {
      continue;
    }

    // products.json -> "products"
    const entity = filePath
      .split("/")
      .pop()
      .replace(/\.json$/i, "")
      .toLowerCase();

    // /api/products or /api/products?x -> last static segment "products"
    const pathsFor = (method) =>
      calls.filter((call) => {
        if (call.method !== method || !call.fullPath) {
          return false;
        }

        const segments = call.fullPath
          .split("/")
          .filter((segment) => segment && segment !== ":param");

        return segments[segments.length - 1]?.toLowerCase() === entity;
      });

    const isListed = pathsFor("GET").length > 0;
    const canCreate = pathsFor("POST").length > 0;

    if (isListed && !canCreate) {
      errors.push(
        `${filePath} is empty, but the frontend lists ${entity} (GET /api/${entity}) and has no way to create them, so the page stays empty. Seed ${filePath} with 8-12 realistic records using the same fields the model and frontend use (each with a unique "_id").`
      );
    }
  }
};

export default validateDataFiles;
