const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

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
  // Auth state
  // ==========================================

  const hasAuthContext = filePaths.some((path) =>
    /AuthContext\.(jsx|tsx|js|ts)$/i.test(path)
  );

  const hasAuthService = filePaths.some((path) =>
    /auth(Service|Api|API)?\.(jsx|tsx|js|ts)$/i.test(path)
  );

  if (!hasAuthContext && !hasAuthService) {
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