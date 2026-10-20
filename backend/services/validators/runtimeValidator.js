import path from "path";

const QUOTE = "[\"'`]";

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Remove /* */ and // comments so commented-out
// routes are not counted. "://" in URLs is kept.
const stripComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

// Matches "<prefix>/health" or "<prefix>/health/"
const pathPattern = (routePath) =>
  `${QUOTE}${escapeRegExp(routePath)}\\/?${QUOTE}`;

// X.get("<path>") or X.route("<path>").get(
const hasGetRoute = (code, objectNames, routePath) =>
  objectNames.some((name) => {
    const object = escapeRegExp(name);
    const route = pathPattern(routePath);

    return (
      new RegExp(
        `\\b${object}\\s*\\.\\s*get\\s*\\(\\s*${route}`
      ).test(code) ||
      new RegExp(
        `\\b${object}\\s*\\.\\s*route\\s*\\(\\s*${route}\\s*\\)\\s*\\.\\s*get\\s*\\(`
      ).test(code)
    );
  });

// Resolve an imported identifier to a backend file path
const resolveImport = (
  identifier,
  code,
  fromPath,
  fileMap
) => {
  const id = escapeRegExp(identifier);

  const match =
    code.match(
      new RegExp(
        `import\\s+${id}\\s+from\\s+["']([^"']+)["']`
      )
    ) ||
    code.match(
      new RegExp(
        `(?:const|let|var)\\s+${id}\\s*=\\s*require\\s*\\(\\s*["']([^"']+)["']\\s*\\)`
      )
    );

  if (!match || !match[1].startsWith(".")) {
    return null;
  }

  const basePath = path.posix.join(
    path.posix.dirname(fromPath),
    match[1]
  );

  const candidates = [
    basePath,
    `${basePath}.js`,
    `${basePath}.mjs`,
    `${basePath}.cjs`,
    `${basePath}/index.js`,
  ];

  return (
    candidates.find((candidate) =>
      fileMap.has(candidate)
    ) || null
  );
};

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

  // All backend JavaScript files (comments removed)
  const backendFiles = [...fileMap.entries()]
    .filter(
      ([filePath]) =>
        (filePath.startsWith("backend/") ||
          filePath.includes("/backend/")) &&
        !filePath.includes("node_modules/") &&
        /\.(c|m)?js$/.test(filePath)
    )
    .map(([filePath, content]) => [
      filePath,
      stripComments(content),
    ]);

  const hasHealthRoute = backendFiles.some(
    ([filePath, code]) => {
      // Express app variables: const X = express()
      const appNames = new Set(["app"]);

      for (const match of code.matchAll(
        /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*express\s*\(\s*\)/g
      )) {
        appNames.add(match[1]);
      }

      const apps = [...appNames];

      // 1. app.get("/health") / app.route("/health").get(
      if (hasGetRoute(code, apps, "/health")) {
        return true;
      }

      // 2. Router mounted on the app:
      //    app.use("/health", router) + router.get("/")
      //    app.use("/", router) or app.use(router)
      //      + router.get("/health")
      for (const appName of apps) {
        const useRegex = new RegExp(
          `\\b${escapeRegExp(appName)}\\s*\\.\\s*use\\s*\\(([^)]*)\\)`,
          "g"
        );

        for (const useMatch of code.matchAll(useRegex)) {
          const args = useMatch[1].trim();

          const mountMatch = args.match(
            /^["'`]([^"'`]*)["'`]\s*,/
          );

          const mountPath = mountMatch
            ? mountMatch[1].replace(/\/+$/, "")
            : "";

          if (
            mountMatch &&
            mountPath !== "" &&
            mountPath !== "/health"
          ) {
            continue;
          }

          const routerArgs = (
            mountMatch
              ? args.slice(mountMatch[0].length)
              : args
          )
            .split(",")
            .map((arg) => arg.trim())
            .filter((arg) =>
              /^[A-Za-z_$][\w$]*$/.test(arg)
            );

          for (const routerName of routerArgs) {
            const routerPath = resolveImport(
              routerName,
              code,
              filePath,
              fileMap
            );

            if (!routerPath) {
              continue;
            }

            const routerCode = stripComments(
              fileMap.get(routerPath)
            );

            // Router variable names: express.Router() / Router()
            const routerNames = [
              ...routerCode.matchAll(
                /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:express\s*\.\s*)?Router\s*\(\s*\)/g
              ),
            ].map((match) => match[1]);

            if (routerNames.length === 0) {
              continue;
            }

            const subPath =
              mountPath === "/health" ? "" : "/health";

            if (
              hasGetRoute(
                routerCode,
                routerNames,
                subPath || "/"
              )
            ) {
              return true;
            }
          }
        }
      }

      return false;
    }
  );

  if (!hasHealthRoute) {
    errors.push(
      "Backend health check endpoint /health is missing."
    );
  }
};

export default validateRuntime;
