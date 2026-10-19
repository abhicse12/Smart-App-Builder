const validateRuntime = ({
  files = [],
  errors,
  warnings,
}) => {
  const fileMap = new Map(
    files.map((file) => [
      String(file.path).replace(/\\/g, "/"),
      file.content || "",
    ])
  );

  const backendAppPath = [...fileMap.keys()].find(
    (filePath) =>
      filePath === "backend/app.js" ||
      filePath.endsWith("/backend/app.js")
  );

  if (!backendAppPath) {
    return;
  }

  const backendApp = fileMap.get(backendAppPath);

  const hasHealthRoute =
    /app\.get\s*\(\s*["'`]\/health["'`]/.test(
      backendApp
    );

  if (!hasHealthRoute) {
    errors.push(
      "Backend health check endpoint /health is missing."
    );
  }
};

export default validateRuntime;