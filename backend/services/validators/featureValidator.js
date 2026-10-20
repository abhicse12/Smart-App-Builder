const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

// Remove /* */ and // comments ("://" in URLs is kept)
const stripComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

// A string literal containing an auth endpoint path,
// e.g. "/api/auth/login", '/login', `${API}/auth/register`
const authEndpointPattern = (actions) =>
  new RegExp(
    `["'\`][^"'\`\\n]*\\/(?:auth\\/)?(?:${actions})\\b[^"'\`\\n]*["'\`]`,
    "i"
  );

const LOGIN_REQUEST = authEndpointPattern("login|signin");
const SIGNUP_REQUEST = authEndpointPattern("signup|register");

// Token / session / cookie / logout handling
const AUTH_STATE_HANDLING = [
  /(localStorage|sessionStorage)\s*\.\s*(get|set|remove)Item\s*\(\s*["'`][^"'`]*(token|auth|user|session)/i,
  /Authorization["'`]?\s*[:,]\s*[`"']?\s*Bearer/i,
  /withCredentials\s*:\s*true/,
  /credentials\s*:\s*["'`]include["'`]/,
  /\blogout\s*[:=(]|function\s+logout\b/i,
];

// Auth context / provider / hook implementation
const AUTH_STATE_IMPLEMENTATION = [
  /createContext\s*(?:<[\s\S]*?>)?\s*\(/,
  /\b(function|const|let|var|class)\s+AuthProvider\b/,
  /\b(function|const|let|var)\s+useAuth\b/,
];

const isFrontendAuthImplementation = (content) => {
  const code = stripComments(content);

  const hasLoginRequest = LOGIN_REQUEST.test(code);
  const hasSignupRequest = SIGNUP_REQUEST.test(code);

  const hasStateHandling = AUTH_STATE_HANDLING.some(
    (pattern) => pattern.test(code)
  );

  // A. Auth service / API module
  if (
    hasLoginRequest &&
    (hasSignupRequest || hasStateHandling)
  ) {
    return true;
  }

  // B. Auth context / provider / hook that manages
  //    login, user or token state
  const hasStateImplementation =
    AUTH_STATE_IMPLEMENTATION.some((pattern) =>
      pattern.test(code)
    ) &&
    /\bAuth(Context|Provider)\b|\buseAuth\b|\bauth\b/i.test(
      code
    );

  return (
    hasStateImplementation &&
    /\b(login|signin|user|token)\b/i.test(code)
  );
};

const validateAuthentication = ({
  filePaths,
  fileMap,
  errors,
}) => {
  const hasAuth =
    filePaths.some((path) =>
      /auth|login|signup|signin|register/i.test(path)
    );

  if (!hasAuth) {
    return;
  }

  // ==========================================
  // Required authentication UI
  // ==========================================

  const loginPage = filePaths.find((path) =>
    /(^|\/)Login\.(jsx|tsx|js|ts)$/i.test(path)
  );

  const signupPage = filePaths.find((path) =>
    /(^|\/)Signup\.(jsx|tsx|js|ts)$/i.test(path)
  );

  if (!loginPage) {
    errors.push(
      "Authentication feature is incomplete: Login page is missing."
    );
  }

  if (!signupPage) {
    errors.push(
      "Authentication feature is incomplete: Signup page is missing."
    );
  }

  // ==========================================
  // Login → Signup navigation
  // ==========================================

  if (loginPage) {
    const loginContent = fileMap.get(loginPage) || "";

    const hasSignupNavigation =
      /\/signup/i.test(loginContent) ||
      /to\s*=\s*["'`][^"'`]*signup/i.test(loginContent) ||
      /navigate\s*\(\s*["'`][^"'`]*signup/i.test(
        loginContent
      );

    if (!hasSignupNavigation) {
      errors.push(
        "Authentication feature is incomplete: Login page does not provide navigation to Signup."
      );
    }
  }

  // ==========================================
  // Signup → Login navigation
  // ==========================================

  if (signupPage) {
    const signupContent = fileMap.get(signupPage) || "";

    const hasLoginNavigation =
      /\/login/i.test(signupContent) ||
      /to\s*=\s*["'`][^"'`]*login/i.test(signupContent) ||
      /navigate\s*\(\s*["'`][^"'`]*login/i.test(
        signupContent
      );

    if (!hasLoginNavigation) {
      errors.push(
        "Authentication feature is incomplete: Signup page does not provide navigation to Login."
      );
    }
  }

  // ==========================================
  // Authentication backend
  // ==========================================

  const hasAuthRoute = filePaths.some((path) =>
    /authRoutes\.(js|ts)$/i.test(path)
  );

  const hasAuthController = filePaths.some((path) =>
    /authController\.(js|ts)$/i.test(path)
  );

  if (!hasAuthRoute) {
    errors.push(
      "Authentication feature is incomplete: authentication routes are missing."
    );
  }

  if (!hasAuthController) {
    errors.push(
      "Authentication feature is incomplete: authentication controller is missing."
    );
  }

  // ==========================================
  // Auth state / service
  //
  // Detected from file content, not file name.
  // Login/Signup page files are excluded so that
  // pages alone do not satisfy this check.
  // ==========================================

  const hasFrontendAuthImplementation = filePaths.some(
    (path) => {
      if (
        !/\.(jsx|tsx|js|ts)$/i.test(path) ||
        /(^|\/)backend\//i.test(path) ||
        /(^|\/)node_modules\//i.test(path) ||
        path === loginPage ||
        path === signupPage
      ) {
        return false;
      }

      return isFrontendAuthImplementation(
        fileMap.get(path) || ""
      );
    }
  );

  if (!hasFrontendAuthImplementation) {
    errors.push(
      "Authentication feature is incomplete: frontend authentication state/service is missing."
    );
  }
};

const validateFeatureCompleteness = ({
  files = [],
  errors = [],
  warnings = [],
}) => {
  if (!Array.isArray(files) || files.length === 0) {
    return;
  }

  const filePaths = files.map((file) =>
    normalizePath(file?.path)
  );

  const fileMap = new Map(
    files.map((file) => [
      normalizePath(file?.path),
      file?.content || "",
    ])
  );

  validateAuthentication({
    filePaths,
    fileMap,
    errors,
  });

  // Prevent unused-parameter warnings in future extensions.
  void warnings;
};

export default validateFeatureCompleteness;