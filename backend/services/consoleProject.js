// Basic Python and Java projects, without frameworks (no Django, Flask,
// FastAPI or Spring Boot):
//
// - console: only Python or only Java selected -> a terminal program
// - web:     Python or Java + HTML / CSS (/ JavaScript) -> HTML pages
//            served by the language's built-in HTTP server, with the
//            program logic in Python / Java (not in JavaScript)

// Technologies that need the full web generator (frameworks, Node, etc.)
const FRAMEWORK_TECH =
  /react|vite|next|tailwind|typescript|node|express|mongo|mern|fastapi|django|flask|uvicorn|spring|mysql|postgres/i;

const PAGE_TECH = /^(html|css|javascript)$/i;

const normalize = (techStack) =>
  Array.isArray(techStack)
    ? techStack.map((tech) => String(tech).trim().toLowerCase())
    : [];

// { language, web, useJavaScript } or null (use the full web generator)
export const getBasicProject = (techStack = []) => {
  const list = normalize(techStack);

  if (list.length === 0 || list.some((tech) => FRAMEWORK_TECH.test(tech))) {
    return null;
  }

  const hasPython = list.includes("python");
  const hasJava = list.includes("java");

  if (hasPython === hasJava) {
    // neither, or both: not a basic single-language project
    return null;
  }

  const others = list.filter((tech) => tech !== "python" && tech !== "java");

  if (others.some((tech) => !PAGE_TECH.test(tech))) {
    return null;
  }

  return {
    language: hasPython ? "python" : "java",
    web: others.length > 0,
    useJavaScript: others.includes("javascript"),
  };
};

// Language of a console (terminal) project, otherwise null
export const getConsoleLanguage = (techStack = []) => {
  const project = getBasicProject(techStack);
  return project && !project.web ? project.language : null;
};

// The same descriptor from generated files (used by the validator, runner,
// fixer and modify flow, which do not know the selected stack)
export const detectBasicProjectFromFiles = (files = []) => {
  const paths = files.map((file) =>
    String(file?.path || "").replace(/\\/g, "/")
  );

  if (paths.some((p) => p.startsWith("frontend/") || p.startsWith("backend/"))) {
    return null;
  }

  const hasPages = paths.some((p) => /^(templates|static)\//.test(p));
  const useJavaScript = paths.some((p) => /^static\/.+\.js$/.test(p));

  if (paths.includes("server.py")) {
    return { language: "python", web: true, useJavaScript };
  }

  if (paths.includes("src/Main.java")) {
    return { language: "java", web: hasPages, useJavaScript };
  }

  if (paths.includes("main.py")) {
    return { language: "python", web: false, useJavaScript: false };
  }

  return null;
};

// Kept for callers that only need the console language
export const detectConsoleLanguageFromFiles = (files = []) => {
  const project = detectBasicProjectFromFiles(files);
  return project && !project.web ? project.language : null;
};

const label = (project) =>
  `${project.language === "python" ? "Python" : "Java"} ${project.web ? "web" : "console"}`;

/* =========================================================
   LAYOUTS
========================================================= */

const CONSOLE_LAYOUTS = {
  python: `
Project layout (Python 3.12, standard library only):

main.py                     entry point (menu loop or demo, see below)
<app_package>/__init__.py   e.g. library/__init__.py (snake_case name)
<app_package>/models.py     classes / dataclasses for the domain
<app_package>/services.py   the program logic (no input()/print here)
<app_package>/storage.py    optional: save/load JSON under data/
tests/test_<topic>.py       unittest tests for the logic
README.md                   what it does, how to run, example session

- Use ONLY the Python standard library (no pip packages, no
  requirements.txt). No web frameworks, no GUI (tkinter, pygame,
  turtle) and no network access.
- Tests use unittest, import the package (e.g. from library.services
  import Library) and run with: python -m unittest discover -s tests
`,
  java: `
Project layout (Java 21, JDK only, default package):

src/Main.java          entry point: public class Main with
                       public static void main(String[] args)
src/<Domain>.java      one public class/record/enum/interface per file,
                       the file name equal to the type name
src/<Logic>Service.java the program logic (no Scanner/System.out here)
src/TestRunner.java    self-checks for the logic (see below)
README.md              what it does, how to compile/run, example session

- NO package declarations: every file is in src/ in the default package.
- Use ONLY the JDK (java.*). No Maven/Gradle, no external libraries, no
  Spring, no GUI (Swing/AWT/JavaFX) and no network access.
- Compiled and run with:
    javac -d out src/*.java && java -cp out Main
- src/TestRunner.java has a main method that checks the logic with
  plain if-checks, prints PASS/FAIL per check and ends with
  System.exit(failures == 0 ? 0 : 1).
`,
};

const pageRules = (project) =>
  project.useJavaScript
    ? `
- JavaScript was selected: static/script.js MAY improve the page (e.g.
  submit the form with fetch() to a JSON endpoint and show the result
  without a reload), but every calculation / rule of the program MUST
  run on the ${project.language === "python" ? "Python" : "Java"} server. The page must still work as a
  normal HTML form.`
    : `
- JavaScript was NOT selected: use NO JavaScript at all (no
  static/*.js, no <script> tags, no inline onclick). The page is a
  normal HTML <form method="post"> and the server renders the result.`;

const WEB_LAYOUTS = {
  python: (project) => `
Project layout (Python 3.12 standard library web app, NO frameworks):

server.py                   http.server.ThreadingHTTPServer +
                            BaseHTTPRequestHandler:
                            - GET /         -> render the main page
                            - POST /<action> -> read the form with
                              urllib.parse.parse_qs, call the logic,
                              render the page with the result or error
                            - GET /static/<file> -> serve files from
                              static/ (correct Content-Type, no "..")
                            - GET /health   -> 200 "ok"
                            Listens on host "0.0.0.0", port
                            int(os.environ.get("PORT", "8000")).
<app_package>/__init__.py   e.g. calculator/__init__.py
<app_package>/logic.py      ALL program logic as plain functions/classes
templates/index.html        page with $placeholders filled by
                            string.Template (values escaped with
                            html.escape)
static/style.css            the styling (linked as /static/style.css)
${project.useJavaScript ? "static/script.js            optional enhancement (see below)\n" : ""}tests/test_<topic>.py       unittest tests for the logic
README.md                   what it does, how to run (python server.py,
                            open http://localhost:8000)

- Use ONLY the Python standard library: no Flask, Django, FastAPI,
  Jinja2 or any pip package, no requirements.txt.
- The server never calls input() and never blocks; invalid form values
  show an error message on the page (never a crash or a 500).
- Tests import the logic package and run with:
  python -m unittest discover -s tests
${pageRules(project)}
`,
  java: (project) => `
Project layout (Java 21 JDK web app, NO frameworks, default package):

src/Main.java          com.sun.net.httpserver.HttpServer:
                       - GET /          -> render the main page
                       - POST /<action> -> read the form body
                         (application/x-www-form-urlencoded, decode with
                         URLDecoder), call the logic, render the page
                       - GET /static/<file> -> serve files from static/
                       - GET /health    -> 200 "ok"
                       Binds new InetSocketAddress("0.0.0.0", port) with
                       port from System.getenv("PORT") (default 8000).
src/<Logic>.java       ALL program logic (one public type per file, file
                       name = type name)
src/TestRunner.java    self-checks for the logic: prints PASS/FAIL and
                       ends with System.exit(failures == 0 ? 0 : 1)
templates/index.html   page with {{placeholders}} replaced in Java
                       (escape user values for HTML)
static/style.css       the styling (linked as /static/style.css)
${project.useJavaScript ? "static/script.js       optional enhancement (see below)\n" : ""}README.md              how to compile/run and open http://localhost:8000

- NO package declarations; only the JDK (java.* and
  com.sun.net.httpserver). No Spring, Maven/Gradle or libraries.
- Read templates/ and static/ files from the working directory
  (Path.of("templates", "index.html")).
- Invalid form values show an error message on the page, never a crash.
${pageRules(project)}
`,
};

const CONSOLE_RUN_RULES = {
  python: `
Running in the sandbox (MANDATORY):
- The program is run with: python main.py < /dev/null  (no keyboard).
- main.py checks sys.stdin.isatty():
    - True  -> interactive menu loop using input()
    - False -> run a short DEMO that exercises the main features with
               sample data and prints clear, formatted output, then exits
- Every input() call is wrapped so EOFError/KeyboardInterrupt end the
  program cleanly instead of crashing.
- The program must finish in a few seconds: no infinite loops, sleeps
  or waiting when not interactive.
- Exit code 0 on success. Invalid user input never crashes the program
  (catch ValueError, show a message, ask again).
`,
  java: `
Running in the sandbox (MANDATORY):
- The program is run with: java -cp out Main < /dev/null  (no keyboard).
- Main checks System.console():
    - not null -> interactive menu loop with a Scanner(System.in)
    - null     -> run a short DEMO that exercises the main features with
                  sample data and prints clear, formatted output, then exits
- The interactive loop stops cleanly when scanner.hasNextLine() is
  false (end of input).
- The program must finish in a few seconds when not interactive.
- Invalid user input never crashes the program
  (catch NumberFormatException, show a message, ask again).
`,
};

const WEB_PAGE_STYLE = `
Page design (plain CSS in static/style.css):
- A centered card (max-width ~480-720px) on a soft background, a clear
  title, labelled inputs, a primary button, and a result area that
  stands out (success color) or an error message (danger color).
- System font stack, comfortable spacing, rounded corners, subtle
  shadow, hover/focus states, responsive on phones.
- Keep the previous form values in the inputs after submitting.
`;

const QUALITY_RULES = `
Code quality:
- Real, complete logic for every feature in the requirements; no TODOs
  or placeholder functions.
- Separate the logic (classes/functions that return values) from the
  I/O (console or HTTP), so tests can check the logic directly.
- Validate inputs and handle edge cases (division by zero, empty
  lists, not found, negative amounts, duplicates).
- Meaningful names, short functions, comments only where helpful.
`;

const projectRules = (project) =>
  project.web
    ? `${WEB_LAYOUTS[project.language](project)}${WEB_PAGE_STYLE}`
    : `${CONSOLE_LAYOUTS[project.language]}${CONSOLE_RUN_RULES[project.language]}`;

/* =========================================================
   ARCHITECT PROMPT
========================================================= */

export const buildConsoleArchitectPrompt = (requirements, project) => `
You are the Architect Agent of an AI application builder.

Design a BASIC ${label(project).toUpperCase()} APPLICATION.
${
  project.web
    ? `It is a small web app: HTML pages served by the built-in HTTP server of
${project.language === "python" ? "Python" : "Java"}, with all program logic written in ${project.language === "python" ? "Python" : "Java"}.
No frameworks, no frontend/backend folders, no database server.`
    : `It is a programming-logic project that runs in the terminal. It is
NOT a web application: no frontend, no server, no frameworks.`
}

==================================================
USER REQUIREMENTS
==================================================

${requirements}

==================================================
RULES
==================================================
${projectRules(project)}
${QUALITY_RULES}

Plan 4-10 files. Every file needed to run the program and its tests
must be in the plan, and every file's purpose must name the classes,
functions, routes or placeholders it contains so the Coder Agent can
keep names consistent across files.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON:

{
  "projectName": "string",
  "description": "string",
  "techStack": ["${project.language === "python" ? "Python" : "Java"}"${project.web ? ', "HTML", "CSS"' : ""}${project.useJavaScript ? ', "JavaScript"' : ""}],
  "files": [
    { "path": "string", "purpose": "string" }
  ],
  "apiContract": []
}

Do NOT include markdown or explanations.
`;

/* =========================================================
   CODER PROMPT
========================================================= */

export const buildConsoleCoderPrompt = ({
  project,
  projectName,
  description,
  files,
  allFiles,
  generatedModules = [],
}) => `
You are the Coder Agent of an AI application builder.

Write complete source code for a BASIC ${label(project).toUpperCase()}
APPLICATION (no frameworks).

Project Name: ${projectName}

Description:
${description}

==================================================
RULES
==================================================
${projectRules(project)}
${QUALITY_RULES}

==================================================
COMPLETE PROJECT STRUCTURE
==================================================

${allFiles.map((file) => `- ${file.path}: ${file.purpose}`).join("\n")}

${
  generatedModules.length > 0
    ? `==================================================
ALREADY GENERATED (USE THESE EXACT NAMES)
==================================================

${generatedModules.join("\n")}
`
    : ""
}
==================================================
REQUESTED FILES
==================================================

${files.map((file) => `Path: ${file.path}\nPurpose: ${file.purpose}`).join("\n\n")}

Generate ONLY the requested files, each complete. Names of classes,
functions, methods, routes, form field names and template placeholders
used across files must match the structure above exactly.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON:

{
  "files": [
    { "path": "file-path", "content": "complete source code" }
  ]
}

The number of files MUST equal the number of requested files.
Do NOT include markdown, code fences or explanations.
`;

/* =========================================================
   FIXER / MODIFY CONTEXT
========================================================= */

export const consoleFixerRules = (project) => `
==================================================
BASIC ${label(project).toUpperCase()} PROJECT RULES
==================================================
${projectRules(project)}
`;

// "path defines: a, B" summaries of generated files for later batches
export const summarizeConsoleModules = (files = [], language) =>
  files
    .map((file) => {
      const code = String(file?.content || "");
      const filePath = String(file?.path || "");

      let names = [];

      if (filePath.endsWith(".py")) {
        names = [...code.matchAll(/^(?:class|def)\s+(\w+)/gm)].map(
          (match) => match[1]
        );
      } else if (filePath.endsWith(".java")) {
        names = [
          ...code.matchAll(
            /\b(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:class|record|enum|interface)\s+(\w+)|\bpublic\s+(?:static\s+)?[\w<>\[\],\s]+?\s(\w+)\s*\(/g
          ),
        ].map((match) => match[1] || match[2]);
      } else if (filePath.endsWith(".html")) {
        // form fields and template placeholders the server must fill
        names = [
          ...code.matchAll(/name\s*=\s*["']([\w-]+)["']/g),
          ...code.matchAll(language === "java" ? /\{\{\s*(\w+)\s*\}\}/g : /\$\{?(\w+)\}?/g),
          ...code.matchAll(/action\s*=\s*["']([^"']+)["']/g),
        ].map((match) => match[1]);
      }

      const unique = [...new Set(names)].filter(Boolean);

      return unique.length > 0
        ? `${file.path} defines: ${unique.join(", ")}`
        : null;
    })
    .filter(Boolean);
