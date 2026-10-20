// Static checks for basic Python / Java console projects. The Docker run
// (program + tests) is the final check; these catch the common problems
// early with messages the Fixer can act on.

const normalizePath = (filePath = "") =>
  String(filePath).replace(/\\/g, "/");

// Remove comments and string contents are kept; good enough for the
// keyword checks below
const stripPythonComments = (code = "") =>
  code.replace(/^\s*#.*$/gm, "");

const stripJavaComments = (code = "") =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"\\])\/\/.*$/gm, "$1");

// Packages that are not in the standard library or cannot work in the
// sandbox (no display, no network, no pip install)
const PYTHON_FORBIDDEN = [
  "numpy", "pandas", "requests", "flask", "django", "fastapi", "uvicorn",
  "matplotlib", "seaborn", "scipy", "sklearn", "tensorflow", "torch",
  "tkinter", "pygame", "turtle", "PyQt5", "PySide6", "kivy", "colorama",
  "rich", "tabulate", "pymongo", "sqlalchemy", "mysql", "psycopg2",
  "dotenv", "bs4", "selenium", "streamlit", "pytest",
];

const validatePython = (files, errors, project) => {
  const byPath = new Map(
    files.map((file) => [normalizePath(file.path), file.content || ""])
  );

  const pyFiles = [...byPath].filter(([p]) => p.endsWith(".py"));
  const allCode = pyFiles.map(([, code]) => stripPythonComments(code)).join("\n");

  if (project.web) {
    const server = stripPythonComments(byPath.get("server.py") || "");

    if (!byPath.has("server.py")) {
      errors.push("Python web project: server.py (the http.server entry point) is missing.");
    } else {
      if (!/http\.server|ThreadingHTTPServer|BaseHTTPRequestHandler/.test(server)) {
        errors.push(
          "server.py must use the standard library http.server (ThreadingHTTPServer + BaseHTTPRequestHandler); no frameworks."
        );
      }

      if (!/["']0\.0\.0\.0["']/.test(server)) {
        errors.push(
          'server.py must listen on host "0.0.0.0" (not localhost / 127.0.0.1), otherwise the page cannot be opened from outside the container.'
        );
      }

      if (!/environ[\s\S]{0,40}PORT|getenv\s*\(\s*["']PORT/.test(server)) {
        errors.push(
          'server.py must read the port from the PORT environment variable: int(os.environ.get("PORT", "8000")).'
        );
      }

      if (!/["']\/health["']/.test(server)) {
        errors.push('server.py must answer GET /health with 200 "ok" (used to check that it started).');
      }

      if (!/def\s+do_POST/.test(server)) {
        errors.push(
          "server.py has no do_POST handler: the HTML form must be submitted to the Python server, which runs the logic and renders the result."
        );
      }
    }
  } else if (!byPath.has("main.py")) {
    errors.push("Python console project: main.py (the entry point) is missing.");
  }

  // Local modules / packages, e.g. library/services.py -> "library"
  const localModules = new Set(
    pyFiles.map(([p]) => p.split("/")[0].replace(/\.py$/, ""))
  );

  for (const [filePath, code] of pyFiles) {
    const cleaned = stripPythonComments(code);

    for (const match of cleaned.matchAll(
      /^\s*(?:from\s+([\w.]+)\s+import|import\s+([\w.]+))/gm
    )) {
      const root = (match[1] || match[2]).split(".")[0];

      if (localModules.has(root)) {
        continue;
      }

      if (PYTHON_FORBIDDEN.some((name) => name.toLowerCase() === root.toLowerCase())) {
        errors.push(
          `${filePath} imports "${root}", which is not available in the sandbox (standard library only, no GUI, no web frameworks). Rewrite it with the Python standard library.`
        );
      }
    }
  }

  // A web server must never wait for keyboard input
  if (project.web && /\binput\s*\(/.test(allCode)) {
    errors.push(
      "The Python web project calls input(). Values come from the HTML form (parse_qs of the POST body); input() would block the server."
    );
  }

  // input() needs a non-interactive path: the sandbox has no keyboard
  if (!project.web && /\binput\s*\(/.test(allCode)) {
    const hasTtyCheck = /isatty\s*\(\s*\)/.test(allCode);
    const handlesEof = /EOFError/.test(allCode);

    if (!hasTtyCheck) {
      errors.push(
        "The program reads input() but main.py never checks sys.stdin.isatty(). Without a keyboard (the sandbox runs python main.py < /dev/null) it must run a short demo with sample data instead of the interactive menu."
      );
    } else if (!handlesEof) {
      errors.push(
        "The program reads input() but never handles EOFError; when input ends, input() raises EOFError and the program crashes. Wrap input() and exit cleanly on EOFError/KeyboardInterrupt."
      );
    }
  }

  const testFiles = pyFiles.filter(([p]) => /^tests\/test_[\w]+\.py$/.test(p));

  if (testFiles.length === 0) {
    errors.push(
      "Python project has no tests: add tests/test_<topic>.py using unittest that checks the program logic (run with python -m unittest discover -s tests)."
    );
  } else if (!testFiles.some(([, code]) => /unittest/.test(code))) {
    errors.push(
      "Python tests must use the standard unittest module (import unittest, class ...(unittest.TestCase)); pytest is not installed."
    );
  }
};

const validateJava = (files, errors, project) => {
  const javaFiles = files
    .map((file) => [normalizePath(file.path), file.content || ""])
    .filter(([p]) => p.endsWith(".java"));

  const main = javaFiles.find(([p]) => p === "src/Main.java");

  if (!main) {
    errors.push("Java console project: src/Main.java (the entry point) is missing.");
  } else if (
    !/public\s+static\s+void\s+main\s*\(\s*(final\s+)?String\s*(\[\]\s*\w+|\w+\s*\[\]|\.\.\.\s*\w+)\s*\)/.test(
      stripJavaComments(main[1])
    )
  ) {
    errors.push("src/Main.java has no public static void main(String[] args) method.");
  }

  const allCode = javaFiles.map(([, code]) => stripJavaComments(code)).join("\n");

  for (const [filePath, code] of javaFiles) {
    const cleaned = stripJavaComments(code);

    if (!filePath.startsWith("src/") || filePath.split("/").length !== 2) {
      errors.push(
        `${filePath} must be directly in src/ (default package, no sub-folders), e.g. src/${filePath.split("/").pop()}.`
      );
    }

    if (/^\s*package\s+[\w.]+\s*;/m.test(cleaned)) {
      errors.push(
        `${filePath} declares a package. Basic Java projects use the default package: remove the package line (all files are in src/).`
      );
    }

    // The public top-level type must be named like the file
    const fileType = filePath.split("/").pop().replace(/\.java$/, "");
    const publicType = cleaned.match(
      /^\s*public\s+(?:final\s+|abstract\s+|sealed\s+)*(?:class|record|enum|interface)\s+(\w+)/m
    );

    if (publicType && publicType[1] !== fileType) {
      errors.push(
        `${filePath} declares public type ${publicType[1]}, but Java requires the file name to match it (${publicType[1]}.java), or rename the type to ${fileType}.`
      );
    }

    for (const match of cleaned.matchAll(/^\s*import\s+(?:static\s+)?([\w.]+)/gm)) {
      const allowed =
        /^java\./.test(match[1]) ||
        (project.web && /^com\.sun\.net\.httpserver\./.test(match[1]));

      if (!allowed || /^java\.awt|^javax\.swing/.test(match[1])) {
        errors.push(
          `${filePath} imports ${match[1]}, which is not allowed. Basic Java projects use only java.* packages${project.web ? " and com.sun.net.httpserver" : ""} (no external libraries, no Swing/AWT).`
        );
      }
    }
  }

  if (project.web) {
    const mainCode = main ? stripJavaComments(main[1]) : "";

    if (!/HttpServer/.test(mainCode)) {
      errors.push(
        "src/Main.java must start a com.sun.net.httpserver.HttpServer that serves the pages; no frameworks."
      );
    }

    if (!/["']0\.0\.0\.0["']/.test(mainCode)) {
      errors.push(
        'src/Main.java must bind new InetSocketAddress("0.0.0.0", port), otherwise the page cannot be opened from outside the container.'
      );
    }

    if (!/getenv\s*\(\s*"PORT"\s*\)/.test(mainCode)) {
      errors.push(
        'src/Main.java must read the port from System.getenv("PORT") (default 8000).'
      );
    }

    if (!/"\/health"/.test(mainCode)) {
      errors.push('src/Main.java must create a /health context that answers 200 "ok".');
    }

    if (!/"POST"/.test(allCode)) {
      errors.push(
        "The Java server never handles POST: the HTML form must be submitted to the Java server, which runs the logic and renders the result."
      );
    }

    if (/new\s+Scanner\s*\(\s*System\.in\s*\)/.test(allCode)) {
      errors.push(
        "The Java web project reads System.in. Values come from the HTML form; reading the keyboard would block the server."
      );
    }
  }

  // Scanner on System.in needs a non-interactive path
  if (!project.web && /new\s+Scanner\s*\(\s*System\.in\s*\)/.test(allCode)) {
    if (!/System\.console\s*\(\s*\)/.test(allCode)) {
      errors.push(
        "The program reads from System.in but Main never checks System.console(). Without a keyboard (the sandbox runs java -cp out Main < /dev/null) it must run a short demo with sample data instead of the interactive menu."
      );
    } else if (!/hasNext(Line|Int)?\s*\(/.test(allCode)) {
      errors.push(
        "The interactive loop reads System.in without checking scanner.hasNextLine(); at end of input nextLine() throws NoSuchElementException. Stop the loop cleanly when there is no more input."
      );
    }
  }

  const testRunner = javaFiles.find(([p]) => p === "src/TestRunner.java");

  if (!testRunner) {
    errors.push(
      "Java project has no tests: add src/TestRunner.java with a main method that checks the logic, prints PASS/FAIL per check and ends with System.exit(failures == 0 ? 0 : 1)."
    );
  }
};

// templates/index.html + static/style.css served by the language's server
const validatePages = (files, project, errors) => {
  const byPath = new Map(
    files.map((file) => [normalizePath(file.path), file.content || ""])
  );

  const page = byPath.get("templates/index.html");

  if (page === undefined) {
    errors.push(
      "Web project: templates/index.html (the page the server renders) is missing."
    );
  }

  if (!byPath.has("static/style.css")) {
    errors.push("Web project: static/style.css is missing.");
  } else if (page !== undefined && !/\/static\/style\.css/.test(page)) {
    errors.push(
      'templates/index.html must link the stylesheet with href="/static/style.css".'
    );
  }

  if (page !== undefined) {
    if (!/<form[\s\S]*method\s*=\s*["']post["']/i.test(page)) {
      errors.push(
        'templates/index.html needs a <form method="post"> that sends the input to the server.'
      );
    }

    // Logic stays in Python/Java; JavaScript only as static/script.js
    if (/<script(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>|\son[a-z]+\s*=\s*["']/i.test(page)) {
      errors.push(
        `templates/index.html contains inline JavaScript. ${project.useJavaScript ? "Move it to static/script.js; the calculations must run on the server." : "JavaScript was not selected: remove it, the form posts to the server instead."}`
      );
    }
  }
};

const validateConsoleProject = ({ files = [], project, errors = [] }) => {
  const webFiles = files.filter((file) =>
    /^(frontend|backend)\//.test(normalizePath(file?.path))
  );

  if (webFiles.length > 0) {
    errors.push(
      "A basic Python/Java project must not contain frontend/ or backend/ folders."
    );
  }

  if (project.language === "python") {
    validatePython(files, errors, project);
  } else if (project.language === "java") {
    validateJava(files, errors, project);
  }

  if (project.web) {
    validatePages(files, project, errors);
  }
};

export default validateConsoleProject;
