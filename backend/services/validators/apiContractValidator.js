import path from "path";

// Checks that the generated frontend and backend actually talk to each
// other: every frontend API call must hit a mounted backend route, and
// the auth flow (token transport, login fields, ids, auth state) must be
// wired the same way on both sides.

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

// Remove /* */ and // comments ("://" in URLs is kept)
const stripComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

const HTTP_METHODS = "get|post|put|patch|delete";

const JS_FILE = /\.(c|m)?(j|t)sx?$/i;

// "/api//tasks/" -> "/api/tasks", ":taskId" / "${id}" -> ":param"
const normalizeRoute = (routePath = "") => {
  let value = String(routePath)
    .split("?")[0]
    .split("#")[0]
    .replace(/\$\{[^}]*\}/g, ":param")
    .replace(/\/+/g, "/");

  if (!value.startsWith("/")) {
    value = `/${value}`;
  }

  if (value.length > 1) {
    value = value.replace(/\/+$/, "");
  }

  return value
    .split("/")
    .map((segment) =>
      segment.startsWith(":") ? ":param" : segment
    )
    .join("/");
};

const joinRoute = (...parts) =>
  normalizeRoute(
    parts
      .filter((part) => part && part !== "/")
      .join("/")
  );

const routesMatch = (a, b) => {
  const left = a.split("/");
  const right = b.split("/");

  if (left.length !== right.length) {
    return false;
  }

  return left.every(
    (segment, index) =>
      segment === right[index] ||
      segment === ":param" ||
      right[index] === ":param"
  );
};

// Resolve a relative import to a file in the generated project
const resolveImport = (fromFile, specifier, filePathSet) => {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const base = normalizePath(
    path.posix.join(path.posix.dirname(fromFile), specifier)
  );

  const candidates = [
    base,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    `${base}/index.js`,
    `${base}/index.ts`,
  ];

  return candidates.find((candidate) => filePathSet.has(candidate)) || null;
};

// Identifiers bound to local imports: { name -> resolved file }
const getLocalImports = (filePath, code, filePathSet) => {
  const imports = new Map();

  const patterns = [
    /(?:const|let|var)\s+(\w+)\s*=\s*require\(\s*["'`](\.[^"'`]+)["'`]\s*\)/g,
    /import\s+(\w+)(?:\s*,\s*\{[^}]*\})?\s+from\s+["'`](\.[^"'`]+)["'`]/g,
    /import\s*\{([^}]*)\}\s*from\s+["'`](\.[^"'`]+)["'`]/g,
  ];

  for (const pattern of patterns) {
    for (const match of code.matchAll(pattern)) {
      const target = resolveImport(filePath, match[2], filePathSet);

      if (!target) {
        continue;
      }

      // Named imports: { api, default as client }
      for (const name of match[1].split(",")) {
        const local = name.trim().split(/\s+as\s+/).pop().trim();

        if (/^\w+$/.test(local)) {
          imports.set(local, target);
        }
      }
    }
  }

  return imports;
};

/* =========================================================
   BACKEND ENDPOINTS
========================================================= */

const analyzeBackendFile = (filePath, code, filePathSet) => {
  const appIds = new Set();
  const routerIds = new Set();

  for (const match of code.matchAll(
    /(?:const|let|var)\s+(\w+)\s*=\s*(express\s*\.\s*Router|Router|express)\s*\(/g
  )) {
    if (match[2] === "express") {
      appIds.add(match[1]);
    } else {
      routerIds.add(match[1]);
    }
  }

  const imports = getLocalImports(filePath, code, filePathSet);

  // router.get("/x", ...) and router.route("/x").get(...).post(...)
  const routes = [];

  for (const match of code.matchAll(
    new RegExp(
      `\\b(\\w+)\\s*\\.\\s*(${HTTP_METHODS})\\s*\\(\\s*(["'\`])([^"'\`]*)\\3`,
      "g"
    )
  )) {
    routes.push({
      object: match[1],
      method: match[2].toUpperCase(),
      path: match[4],
    });
  }

  for (const match of code.matchAll(
    /\b(\w+)\s*\.\s*route\s*\(\s*(["'`])([^"'`]*)\2\s*\)((?:\s*\.\s*(?:get|post|put|patch|delete|all)\s*\([^;]*?\))+)/g
  )) {
    for (const method of match[4].matchAll(
      new RegExp(`\\.\\s*(${HTTP_METHODS})\\s*\\(`, "g")
    )) {
      routes.push({
        object: match[1],
        method: method[1].toUpperCase(),
        path: match[3],
      });
    }
  }

  // app.use("/api/x", xRoutes) / app.use("/api/x", auth, require("./routes/x"))
  const mounts = [];

  for (const match of code.matchAll(
    /\b(\w+)\s*\.\s*use\s*\(\s*(["'`])([^"'`]*)\2\s*,([^;]*?)\)\s*;?\s*$/gm
  )) {
    const args = match[4];
    const required = [
      ...args.matchAll(/require\(\s*["'`](\.[^"'`]+)["'`]\s*\)/g),
    ];

    let target = null;

    if (required.length > 0) {
      target = resolveImport(
        filePath,
        required[required.length - 1][1],
        filePathSet
      );
    } else {
      const identifiers = args
        .split(",")
        .map((arg) => arg.trim())
        .filter((arg) => /^\w+$/.test(arg));

      const last = identifiers[identifiers.length - 1];

      if (last && imports.has(last)) {
        target = imports.get(last);
      } else if (last && routerIds.has(last)) {
        target = `${filePath}#${last}`;
      }
    }

    if (target) {
      mounts.push({
        object: match[1],
        prefix: match[3],
        target,
      });
    }
  }

  return { appIds, routerIds, imports, routes, mounts };
};

export const extractBackendEndpoints = (files = []) => {
  const backendFiles = files.filter((file) => {
    const filePath = normalizePath(file?.path);
    return filePath.startsWith("backend/") && JS_FILE.test(filePath);
  });

  const filePathSet = new Set(
    files.map((file) => normalizePath(file?.path))
  );

  const analyses = new Map(
    backendFiles.map((file) => {
      const filePath = normalizePath(file.path);
      return [
        filePath,
        analyzeBackendFile(
          filePath,
          stripComments(file.content || ""),
          filePathSet
        ),
      ];
    })
  );

  const appFiles = new Set(
    [...analyses]
      .filter(([, analysis]) => analysis.appIds.size > 0)
      .map(([filePath]) => filePath)
  );

  // Objects that behave like the express app in each file:
  // created with express() or imported from a file that creates it
  const appObjectsOf = (filePath) => {
    const analysis = analyses.get(filePath);
    const ids = new Set(analysis.appIds);

    for (const [name, target] of analysis.imports) {
      if (appFiles.has(target)) {
        ids.add(name);
      }
    }

    return ids;
  };

  const endpoints = [];
  const reachedRouteFiles = new Set();
  const visited = new Set();

  const walk = (filePath, objectIds, prefix) => {
    const key = `${filePath}|${[...objectIds].join(",")}|${prefix}`;

    if (visited.has(key) || visited.size > 500) {
      return;
    }

    visited.add(key);

    const analysis = analyses.get(filePath);

    if (!analysis) {
      return;
    }

    for (const route of analysis.routes) {
      if (objectIds.has(route.object)) {
        endpoints.push({
          method: route.method,
          path: joinRoute(prefix, route.path),
          file: filePath,
        });
      }
    }

    for (const mount of analysis.mounts) {
      if (!objectIds.has(mount.object)) {
        continue;
      }

      const [targetFile, routerName] = mount.target.split("#");
      const targetAnalysis = analyses.get(targetFile);

      if (!targetAnalysis) {
        continue;
      }

      reachedRouteFiles.add(targetFile);

      walk(
        targetFile,
        routerName
          ? new Set([routerName])
          : targetAnalysis.routerIds.size > 0
            ? targetAnalysis.routerIds
            : targetAnalysis.appIds,
        joinRoute(prefix, mount.prefix)
      );
    }
  };

  for (const filePath of analyses.keys()) {
    const appIds = appObjectsOf(filePath);

    if (appIds.size > 0) {
      walk(filePath, appIds, "/");
    }
  }

  // Route files that declare routes but are never mounted
  const unmountedRouteFiles = [...analyses]
    .filter(
      ([filePath, analysis]) =>
        analysis.routerIds.size > 0 &&
        analysis.routes.some((route) =>
          analysis.routerIds.has(route.object)
        ) &&
        !reachedRouteFiles.has(filePath)
    )
    .map(([filePath]) => filePath);

  const unique = new Map(
    endpoints.map((endpoint) => [
      `${endpoint.method} ${endpoint.path}`,
      endpoint,
    ])
  );

  return {
    endpoints: [...unique.values()],
    hasApp: appFiles.size > 0,
    unmountedRouteFiles,
  };
};

/* =========================================================
   FRONTEND API CALLS
========================================================= */

const getClientBaseUrl = (code) => {
  const match = code.match(
    /baseURL\s*:\s*([^,\n}]+)/
  );

  if (!match) {
    return "";
  }

  // baseURL: import.meta.env.VITE_API_URL || "/api" -> "/api"
  const literals = [
    ...match[1].matchAll(/(["'`])([^"'`]*)\1/g),
  ].map((literal) => literal[2]);

  return literals.length > 0 ? literals[literals.length - 1] : null;
};

// Object literal keys of the request body: { email, password: pw } -> [email, password]
const getObjectKeys = (body = "") =>
  body
    .split(",")
    .map((part) => part.trim().split(/\s*:\s*/)[0].replace(/["'`]/g, ""))
    .filter((key) => /^\w+$/.test(key));

export const extractFrontendCalls = (files = []) => {
  const frontendFiles = files.filter((file) => {
    const filePath = normalizePath(file?.path);
    return filePath.startsWith("frontend/") && JS_FILE.test(filePath);
  });

  const filePathSet = new Set(
    files.map((file) => normalizePath(file?.path))
  );

  // Axios instances: file -> { names, baseURL }
  const clients = new Map();

  for (const file of frontendFiles) {
    const filePath = normalizePath(file.path);
    const code = stripComments(file.content || "");

    const names = [
      ...code.matchAll(
        /(?:const|let|var)\s+(\w+)\s*=\s*axios\s*\.\s*create\s*\(/g
      ),
    ].map((match) => match[1]);

    if (names.length > 0) {
      clients.set(filePath, {
        names: new Set(names),
        baseURL: getClientBaseUrl(code),
      });
    }
  }

  const calls = [];

  for (const file of frontendFiles) {
    const filePath = normalizePath(file.path);
    const code = stripComments(file.content || "");

    // Identifier -> base URL of the client it refers to
    const bases = new Map([["axios", ""]]);

    const ownClient = clients.get(filePath);

    if (ownClient) {
      for (const name of ownClient.names) {
        bases.set(name, ownClient.baseURL);
      }
    }

    for (const [name, target] of getLocalImports(
      filePath,
      code,
      filePathSet
    )) {
      if (clients.has(target)) {
        bases.set(name, clients.get(target).baseURL);
      }
    }

    for (const match of code.matchAll(
      new RegExp(
        `\\b(\\w+)\\s*\\.\\s*(${HTTP_METHODS})\\s*\\(\\s*(["'\`])([^"'\`]*)\\3(\\s*,\\s*\\{([^{}]*)\\})?`,
        "g"
      )
    )) {
      if (!bases.has(match[1])) {
        continue;
      }

      calls.push({
        file: filePath,
        method: match[2].toUpperCase(),
        url: match[4],
        base: bases.get(match[1]),
        bodyKeys: match[6] !== undefined ? getObjectKeys(match[6]) : null,
      });
    }

    for (const match of code.matchAll(
      /\bfetch\s*\(\s*(["'`])([^"'`]*)\1([\s\S]{0,300})/g
    )) {
      const methodMatch = match[3].match(
        /method\s*:\s*["'`](\w+)["'`]/
      );

      const bodyMatch = match[3].match(
        /JSON\.stringify\s*\(\s*\{([^{}]*)\}/
      );

      calls.push({
        file: filePath,
        method: (methodMatch?.[1] || "GET").toUpperCase(),
        url: match[2],
        base: "",
        bodyKeys: bodyMatch ? getObjectKeys(bodyMatch[1]) : null,
      });
    }
  }

  return calls
    .map((call) => {
      // `${API_URL}/tasks`: the base is a variable we cannot resolve
      if (/^\$\{/.test(call.url) || call.base === null) {
        return { ...call, fullPath: null };
      }

      if (/^https?:\/\//i.test(call.url)) {
        return { ...call, fullPath: null, absolute: true };
      }

      if (/^https?:\/\//i.test(call.base)) {
        return { ...call, fullPath: null, absolute: true };
      }

      return {
        ...call,
        fullPath: joinRoute(call.base, call.url),
      };
    })
    .filter((call) => call.url !== "");
};

/* =========================================================
   VALIDATION
========================================================= */

const describeEndpoints = (endpoints, fullPath) => {
  const firstSegments = fullPath.split("/").slice(0, 3).join("/");

  const related = endpoints.filter((endpoint) =>
    endpoint.path.startsWith(firstSegments)
  );

  const list = (related.length > 0 ? related : endpoints)
    .slice(0, 20)
    .map((endpoint) => `${endpoint.method} ${endpoint.path}`);

  return list.length > 0 ? list.join(", ") : "none";
};

// Destructured fields read from req.body inside a handler, e.g.
// exports.login = async (req, res) => { const { email, password } = req.body
const getHandlerBodyFields = (code, handlerPattern) => {
  const handler = code.match(
    new RegExp(
      `(?:exports\\.|export\\s+(?:const|async\\s+function|function)\\s+|const\\s+|function\\s+|async\\s+function\\s+)(${handlerPattern})\\b[\\s\\S]{0,1500}?(?:const|let)\\s*\\{([^}]*)\\}\\s*=\\s*req\\.body`,
      "i"
    )
  );

  return handler ? getObjectKeys(handler[2]) : null;
};

/* =========================================================
   JWT SIGN / VERIFY CONSISTENCY
========================================================= */

// Every `const NAME = <expr>` in the backend (first definition wins)
const collectDefinitions = (backendFiles) => {
  const definitions = new Map();

  for (const file of backendFiles) {
    for (const match of file.content.matchAll(
      /(?:const|let|var)\s+([\w$]+)\s*=\s*([^;\n]+)/g
    )) {
      if (!definitions.has(match[1])) {
        definitions.set(match[1], match[2].trim());
      }
    }

    // exports.JWT_SECRET = ... / module.exports.JWT_SECRET = ...
    for (const match of file.content.matchAll(
      /(?:module\.)?exports\.([\w$]+)\s*=\s*([^;\n]+)/g
    )) {
      if (!definitions.has(match[1])) {
        definitions.set(match[1], match[2].trim());
      }
    }
  }

  return definitions;
};

// "process.env.JWT_SECRET || 'dev'" -> { env: "JWT_SECRET", fallback: "dev" }
const resolveSecret = (expression, definitions) => {
  let value = expression.trim();

  // Follow identifiers / config.jwtSecret style references a few levels
  for (let depth = 0; depth < 4; depth++) {
    const identifier = value.match(/^(?:[\w$]+\.)?([\w$]+)$/);

    if (
      !identifier ||
      /^process\.env\./.test(value) ||
      !definitions.has(identifier[1])
    ) {
      break;
    }

    value = definitions.get(identifier[1]);
  }

  const env = value.match(/process\.env\.([\w$]+)/)?.[1] || null;
  const literals = [...value.matchAll(/(["'`])([^"'`]*)\1/g)].map(
    (match) => match[2]
  );

  return {
    expression: value,
    env,
    fallback: literals.length > 0 ? literals[literals.length - 1] : null,
  };
};

const validateJwt = ({ backendFiles, backendCode, envVariables, errors }) => {
  const definitions = collectDefinitions(backendFiles);
  const uses = [];

  for (const file of backendFiles) {
    for (const match of file.content.matchAll(
      /jwt\s*\.\s*(sign|verify)\s*\(\s*(\{[^}]*\}|[^,]+?)\s*,\s*([^,)]+)/g
    )) {
      uses.push({
        kind: match[1],
        file: file.path,
        payload: match[2],
        secret: resolveSecret(match[3], definitions),
      });
    }
  }

  const signs = uses.filter((use) => use.kind === "sign");
  const verifies = uses.filter((use) => use.kind === "verify");

  if (signs.length === 0 || verifies.length === 0) {
    return;
  }

  const describeSecret = (use) =>
    `${use.file} ${use.kind}s with ${use.secret.env ? `process.env.${use.secret.env}` : "no env variable"}${use.secret.fallback !== null ? ` || "${use.secret.fallback}"` : ""}`;

  // Without a .env file the fallback is the real secret, so it must match
  const variants = new Set(
    uses.map((use) => `${use.secret.env}|${use.secret.fallback}`)
  );

  if (variants.size > 1) {
    errors.push(
      `JWT secret mismatch: tokens are signed and verified with different secrets, so every token is rejected (401 "token failed") after login. ${uses
        .map(describeSecret)
        .join("; ")}. Define the secret once (e.g. backend/config/jwt.js: process.env.JWT_SECRET || "dev-jwt-secret") and use it for both jwt.sign and jwt.verify.`
    );
  } else if (
    uses.some(
      (use) =>
        use.secret.env &&
        use.secret.fallback === null &&
        !envVariables.has(use.secret.env)
    )
  ) {
    errors.push(
      `JWT secret has no fallback: ${uses
        .filter((use) => use.secret.fallback === null)
        .map(describeSecret)
        .join("; ")}. The sandbox has no .env file, so process.env.JWT_SECRET is undefined and jwt.sign/verify throw. Use process.env.JWT_SECRET || "dev-jwt-secret" from one shared module.`
    );
  }

  // Fields read from the decoded token must exist in the signed payload
  const payloadKeys = new Set();
  let payloadsKnown = true;

  for (const sign of signs) {
    if (!sign.payload.startsWith("{")) {
      payloadsKnown = false;
      break;
    }

    for (const key of getObjectKeys(sign.payload.slice(1, -1))) {
      payloadKeys.add(key);
    }
  }

  if (!payloadsKnown || payloadKeys.size === 0) {
    return;
  }

  const reads = new Set(
    [...backendCode.matchAll(/\bdecoded\s*\.\s*([\w$]+)/g)].map(
      (match) => match[1]
    )
  );

  // req.user = decoded: controllers read the payload through req.user
  if (/req\.user\s*=\s*decoded\b/.test(backendCode)) {
    for (const match of backendCode.matchAll(/\breq\.user\s*\.\s*([\w$]+)/g)) {
      reads.add(match[1]);
    }
  }

  const missing = [...reads].filter(
    (key) => !payloadKeys.has(key) && !["iat", "exp"].includes(key)
  );

  if (missing.length > 0) {
    errors.push(
      `JWT payload mismatch: tokens are signed with { ${[...payloadKeys].join(", ")} } but the backend reads ${missing
        .map((key) => `"${key}"`)
        .join(", ")} from the decoded token (decoded.${missing[0]} / req.user.${missing[0]}), which is undefined. Use the same field name when signing and reading the token.`
    );
  }
};

const validateAuthWiring = ({
  backendFiles,
  backendCode,
  frontendCode,
  frontendFiles,
  calls,
  envVariables = new Set(),
  errors,
}) => {
  const usesCookieAuth = /req\.cookies\b/.test(backendCode);
  const hasCookieParser = /cookieParser\s*\(|cookie-parser/.test(backendCode) &&
    /\.use\s*\(\s*cookieParser\s*\(/.test(backendCode);

  if (usesCookieAuth && !hasCookieParser) {
    errors.push(
      "Backend auth reads req.cookies but cookie-parser is never registered with app.use(cookieParser()), so req.cookies is undefined and protected routes crash. Use the Bearer token convention: read the token from req.headers.authorization."
    );
  }

  const readsAuthHeader =
    /req\.headers\s*(\.\s*authorization|\[\s*["'`]authorization["'`]\s*\])|req\.(header|get)\s*\(\s*["'`]authorization["'`]/i.test(
      backendCode
    );

  const frontendSendsBearer =
    /Authorization["'`]?\s*\]?\s*[:=,]\s*[`"']?\s*Bearer/i.test(frontendCode);

  validateJwt({ backendFiles, backendCode, envVariables, errors });

  // Relative /api requests go through the Vite proxy (same origin), so a
  // complete cookie flow works without withCredentials. Only report a
  // Bearer header the backend ignores when the cookie flow is broken too.
  const cookieAuthWorks =
    usesCookieAuth &&
    hasCookieParser &&
    /res\.cookie\s*\(/.test(backendCode);

  if (frontendSendsBearer && !readsAuthHeader && !cookieAuthWorks) {
    errors.push(
      "Token transport mismatch: the frontend sends 'Authorization: Bearer <token>' but the backend auth middleware never reads req.headers.authorization" +
        (usesCookieAuth ? " (it reads a cookie instead)" : "") +
        ". Make the middleware read the Bearer token from req.headers.authorization."
    );
  }

  // Frontend reads a token from the login response
  const frontendReadsToken =
    /\b(data|response\.data|res\.data|result|json)\s*\??\.\s*token\b|\{\s*[^}]*\btoken\b[^}]*\}\s*=\s*(await\s+)?(res|response|data|result)/.test(
      frontendCode
    );

  // { token, user } / { token: jwt } - "token" as a key, not inside a message
  const backendReturnsToken =
    /\.json\s*\(\s*\{(?:[^}]*?,)?\s*token\s*[,:}]/.test(backendCode);

  if (frontendReadsToken && !backendReturnsToken) {
    errors.push(
      "The frontend reads 'token' from the login response, but no backend handler returns a token in its JSON response" +
        (/res\.cookie\s*\(/.test(backendCode) ? " (it only sets a cookie)" : "") +
        ". Login and signup must respond with { token, user }."
    );
  }

  // Login / signup request fields must match what the controller reads
  const checks = [
    { label: "login", call: /\/(auth\/)?(login|signin)$/i, handler: "login\\w*|signin\\w*|loginUser" },
    { label: "signup", call: /\/(auth\/)?(signup|register)$/i, handler: "signup\\w*|register\\w*|signUp\\w*" },
  ];

  for (const check of checks) {
    const call = calls.find(
      (item) =>
        item.method === "POST" &&
        item.fullPath &&
        check.call.test(item.fullPath) &&
        Array.isArray(item.bodyKeys) &&
        item.bodyKeys.length > 0
    );

    const backendFields = getHandlerBodyFields(backendCode, check.handler);

    if (!call || !backendFields || backendFields.length === 0) {
      continue;
    }

    const missing = backendFields.filter(
      (field) => !call.bodyKeys.includes(field)
    );

    // Only report the identifier/credential fields the backend relies on
    const important = missing.filter((field) =>
      /^(email|username|user|password|name|identifier|login)$/i.test(field)
    );

    if (important.length > 0) {
      errors.push(
        `${check.label} field mismatch: ${call.file} sends { ${call.bodyKeys.join(", ")} } but the backend ${check.label} handler reads { ${backendFields.join(", ")} } from req.body (missing: ${important.join(", ")}). Users must ${check.label === "login" ? "log in with { email, password }" : "sign up with { name, email, password }"} on both sides.`
      );
    }
  }

  // JSON-mode records created with "id" while the code reads "._id"
  // Checked per file: one repository using _id must not hide another using id
  const idFiles = backendFiles.filter(
    (file) =>
      /\{\s*(?:\.\.\.\w+\s*,\s*)?id\s*:\s*(uuidv4|uuid|crypto\.randomUUID|randomUUID|Date\.now|nanoid|generateId)\b/.test(
        file.content
      ) &&
      !/\b_id\s*:\s*(uuidv4|uuid|crypto\.randomUUID|randomUUID|Date\.now|nanoid|generateId|String\()/.test(
        file.content
      )
  );

  // Objects read only as x._id (code that also reads x.id handles both)
  const underscoreOnly = [
    ...new Set(
      [...backendCode.matchAll(/\b(\w+)\._id\b/g)].map((match) => match[1])
    ),
  ].filter(
    (name) => !new RegExp(`\\b${name}\\.id\\b`).test(backendCode)
  );

  // jwt.sign({ id: user._id }) with no .id fallback in the payload
  const jwtUsesUnderscoreOnly = [
    ...backendCode.matchAll(/jwt\s*\.\s*sign\s*\(\s*\{([^}]*)\}/g),
  ].some(
    (match) => /\b\w+\._id\b/.test(match[1]) && !/\b\w+\.id\b/.test(match[1])
  );

  if (
    idFiles.length > 0 &&
    (underscoreOnly.length > 0 || jwtUsesUnderscoreOnly)
  ) {
    errors.push(
      `Record id mismatch: ${idFiles.map((file) => file.path).join(", ")} create${idFiles.length === 1 ? "s" : ""} JSON-mode records with an 'id' field, but the backend reads '._id' (e.g. user._id in the JWT), which is undefined in JSON mode. Store JSON records with an '_id' field, like Mongoose does.`
    );
  }

  // Auth state read once from localStorage in the router component
  const routerFile = frontendFiles.find((file) =>
    /<Routes\b/.test(file.content) &&
    /(?:const|let)\s+\w+\s*=\s*!*\s*(?:Boolean\()?\s*localStorage\.getItem\s*\(/.test(
      file.content
    ) &&
    !/useState\s*\(\s*(?:\(\)\s*=>\s*)?!*\s*(?:Boolean\()?\s*localStorage\.getItem/.test(
      file.content
    )
  );

  const loginNavigates = frontendFiles.some(
    (file) =>
      /(^|\/)Login\.(jsx|tsx|js|ts)$/i.test(file.path) &&
      /\bnavigate\s*\(/.test(file.content) &&
      !/useAuth\s*\(|useContext\s*\(/.test(file.content)
  );

  if (routerFile && loginNavigates) {
    errors.push(
      `${routerFile.path} reads the auth token from localStorage once during render. After login, navigate() does not re-render it, so the user is sent back to /login. Keep auth state in React state (AuthContext with useState) and update it in login().`
    );
  }
};

const validateApiContract = ({
  files = [],
  errors = [],
  warnings = [],
}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const hasBackend = files.some((file) =>
    normalizePath(file?.path).startsWith("backend/")
  );

  const hasFrontend = files.some((file) =>
    normalizePath(file?.path).startsWith("frontend/")
  );

  if (!hasBackend || !hasFrontend) {
    return;
  }

  const { endpoints, hasApp, unmountedRouteFiles } =
    extractBackendEndpoints(files);

  const calls = extractFrontendCalls(files);

  if (!hasApp) {
    // Express app not detected: other validators report that
    return;
  }

  for (const routeFile of unmountedRouteFiles) {
    errors.push(
      `${routeFile} defines routes but is never mounted with app.use("/api/...", ...), so none of its endpoints exist.`
    );
  }

  // ---------------------------------------------
  // Every frontend call must reach a backend route
  // ---------------------------------------------

  const reported = new Set();

  for (const call of calls) {
    if (call.absolute) {
      errors.push(
        `${call.file} calls a hardcoded backend URL (${call.base || ""}${call.url}). Use the api client with baseURL "/api" so requests go through the Vite proxy.`
      );
      continue;
    }

    if (!call.fullPath) {
      continue;
    }

    const key = `${call.method} ${call.fullPath}`;

    if (reported.has(key)) {
      continue;
    }

    if (!call.fullPath.startsWith("/api")) {
      reported.add(key);
      errors.push(
        `${call.file} calls ${call.method} ${call.fullPath}, which does not start with /api. The Vite dev server only proxies /api to the backend, so this request never reaches it. Use the api client (baseURL "/api") and call paths like "/auth/login".`
      );
      continue;
    }

    const samePath = endpoints.filter((endpoint) =>
      routesMatch(endpoint.path, call.fullPath)
    );

    if (samePath.some((endpoint) => endpoint.method === call.method)) {
      continue;
    }

    reported.add(key);

    if (samePath.length > 0) {
      errors.push(
        `${call.file} calls ${call.method} ${call.fullPath} but the backend only defines ${samePath
          .map((endpoint) => endpoint.method)
          .join("/")} for that path.`
      );
    } else {
      errors.push(
        `${call.file} calls ${call.method} ${call.fullPath} but no backend route matches it. Related backend routes: ${describeEndpoints(endpoints, call.fullPath)}. Make the frontend call and the backend route use the same path.`
      );
    }
  }

  // ---------------------------------------------
  // Authentication wiring
  // ---------------------------------------------

  const backendFiles = files.filter((file) =>
    normalizePath(file?.path).startsWith("backend/") &&
    JS_FILE.test(normalizePath(file?.path))
  );

  const frontendFiles = files
    .filter(
      (file) =>
        normalizePath(file?.path).startsWith("frontend/") &&
        JS_FILE.test(normalizePath(file?.path))
    )
    .map((file) => ({
      path: normalizePath(file.path),
      content: stripComments(file.content || ""),
    }));

  const hasAuth =
    endpoints.some((endpoint) =>
      /\/(login|signin)$/i.test(endpoint.path)
    ) ||
    calls.some((call) => /\/(login|signin)$/i.test(call.fullPath || ""));

  if (hasAuth) {
    const strippedBackendFiles = backendFiles.map((file) => ({
      path: normalizePath(file.path),
      content: stripComments(file.content || ""),
    }));

    validateAuthWiring({
      backendFiles: strippedBackendFiles,
      backendCode: strippedBackendFiles
        .map((file) => file.content)
        .join("\n"),
      frontendCode: frontendFiles.map((file) => file.content).join("\n"),
      frontendFiles,
      calls,
      // Variables set by a generated .env file (not .env.example)
      envVariables: new Set(
        files
          .filter((file) =>
            /(^|\/)\.env$/.test(normalizePath(file?.path))
          )
          .flatMap((file) =>
            [...String(file.content || "").matchAll(/^\s*([\w]+)\s*=\s*\S/gm)].map(
              (match) => match[1]
            )
          )
      ),
      errors,
    });
  }

  void warnings;
};

export default validateApiContract;
