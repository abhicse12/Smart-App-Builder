// Basic (console) Python and Java projects: programming-logic apps such
// as a library manager, bank account simulator or quiz, run from the
// terminal. No web frameworks (Django, Flask, FastAPI, Spring Boot) and
// no frontend.

// Selected technologies that make a project a web project instead
const WEB_TECH =
  /react|vite|next|html|css|tailwind|javascript|typescript|node|express|mongo|mern|fastapi|django|flask|uvicorn|spring|mysql|postgres/i;

const normalize = (techStack) =>
  Array.isArray(techStack)
    ? techStack.map((tech) => String(tech).trim().toLowerCase())
    : [];

// "python" | "java" | null, from the technologies the user selected
export const getConsoleLanguage = (techStack = []) => {
  const list = normalize(techStack);

  if (list.length === 0 || list.some((tech) => WEB_TECH.test(tech))) {
    return null;
  }

  const hasPython = list.some((tech) => /python/.test(tech));
  // Whole word "java" so that "JavaScript" does not match
  const hasJava = list.some((tech) => /\bjava\b/.test(tech));

  if (hasPython && hasJava) {
    return null;
  }

  if (hasPython) return "python";
  if (hasJava) return "java";
  return null;
};

// Same answer from generated files (used by the validator, runner and
// fixer, which do not know the selected stack)
export const detectConsoleLanguageFromFiles = (files = []) => {
  const paths = files.map((file) =>
    String(file?.path || "").replace(/\\/g, "/")
  );

  if (paths.some((p) => p.startsWith("frontend/") || p.startsWith("backend/"))) {
    return null;
  }

  if (paths.includes("main.py")) return "python";
  if (paths.includes("src/Main.java")) return "java";
  return null;
};

/* =========================================================
   SHARED RULES
========================================================= */

const LAYOUTS = {
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

const RUN_RULES = {
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

const QUALITY_RULES = `
Code quality:
- Real, complete logic for every feature in the requirements; no TODOs
  or placeholder functions.
- Separate the logic (classes/functions that return values) from the
  console I/O, so tests can check the logic directly.
- Validate inputs and handle edge cases (empty lists, not found,
  negative amounts, duplicates).
- Readable console output: a title banner, numbered menus, aligned
  tables where useful, clear success/error messages.
- Meaningful names, short functions, comments only where helpful.
`;

/* =========================================================
   ARCHITECT PROMPT
========================================================= */

export const buildConsoleArchitectPrompt = (requirements, language) => `
You are the Architect Agent of an AI application builder.

Design a BASIC ${language === "python" ? "Python" : "Java"} CONSOLE
APPLICATION (a programming-logic project that runs in the terminal).
It is NOT a web application: no frontend, no backend server, no
database server, no frameworks.

==================================================
USER REQUIREMENTS
==================================================

${requirements}

==================================================
RULES
==================================================
${LAYOUTS[language]}
${RUN_RULES[language]}
${QUALITY_RULES}

Plan 4-10 files. Every file needed to run the program and its tests
must be in the plan, and every file's purpose must name the classes or
functions it contains so the Coder Agent can keep names consistent
across files.

==================================================
OUTPUT
==================================================

Return ONLY valid JSON:

{
  "projectName": "string",
  "description": "string",
  "techStack": ["${language === "python" ? "Python" : "Java"}"],
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
  language,
  projectName,
  description,
  files,
  allFiles,
  generatedModules = [],
}) => `
You are the Coder Agent of an AI application builder.

Write complete source code for a BASIC ${language === "python" ? "Python" : "Java"}
CONSOLE APPLICATION (no web frameworks, no frontend, no server).

Project Name: ${projectName}

Description:
${description}

==================================================
RULES
==================================================
${LAYOUTS[language]}
${RUN_RULES[language]}
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
functions and methods used across files must match the structure above
exactly.

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
   FIXER CONTEXT
========================================================= */

export const consoleFixerRules = (language) => `
==================================================
CONSOLE PROJECT RULES (${language === "python" ? "PYTHON" : "JAVA"})
==================================================
${LAYOUTS[language]}
${RUN_RULES[language]}
`;

// "path: def a, class B" summaries of generated files for later batches
export const summarizeConsoleModules = (files = [], language) =>
  files
    .map((file) => {
      const code = String(file?.content || "");
      const names =
        language === "python"
          ? [
              ...code.matchAll(/^(?:class|def)\s+(\w+)/gm),
            ].map((match) => match[1])
          : [
              ...code.matchAll(
                /\b(?:public\s+)?(?:static\s+)?(?:final\s+)?(?:class|record|enum|interface)\s+(\w+)|\bpublic\s+(?:static\s+)?[\w<>\[\],\s]+?\s(\w+)\s*\(/g
              ),
            ].map((match) => match[1] || match[2]);

      const unique = [...new Set(names)].filter(Boolean);

      return unique.length > 0
        ? `${file.path} defines: ${unique.join(", ")}`
        : null;
    })
    .filter(Boolean);
