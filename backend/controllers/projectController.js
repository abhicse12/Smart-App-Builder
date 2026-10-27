import Project from "../models/Project.js";
import DeletedProject from "../models/DeletedProject.js";
import modifyProjectService from "../services/modifyProjectService.js";

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { ZipArchive } from "archiver";

import runProjectInDocker, {
  stopProject,
} from "../services/runnerService.js";

import writeProjectFiles from "../services/writeProjectFiles.js";
import modifyValidatorService from "../services/modifyValidatorService.js";
import validateProject from "../services/validatorService.js";
import runAuthSmokeTest from "../services/authSmokeTest.js";
import { isUiRequest } from "../services/uiDesignRules.js";
import fixProject from "../services/fixerService.js";
import syncProjectFiles from "../services/syncProjectFiles.js";
import { errorDetails } from "../utils/errorResponse.js";

// Folders left out of project downloads (dependencies, build output,
// caches); same list as syncProjectFiles
const DOWNLOAD_SKIPPED_DIRECTORIES = [
  "**/node_modules",
  "**/dist",
  "**/build",
  "**/.git",
  "**/.vite",
  "**/.next",
  "**/coverage",
  "**/.cache",
];

// ======================================================
// CREATE PROJECT
// ======================================================

const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_TECH_ITEMS = 20;
const MAX_TECH_LENGTH = 50;

// Validates the client-supplied project fields.
// Returns { fields } or { error }.
const validateNewProject = (body = {}) => {
  const { name, description = "", techStack = [] } = body;

  if (typeof name !== "string" || !name.trim()) {
    return { error: "Project name is required" };
  }

  if (name.trim().length > MAX_NAME_LENGTH) {
    return {
      error: `Project name must be at most ${MAX_NAME_LENGTH} characters`,
    };
  }

  if (
    typeof description !== "string" ||
    description.length > MAX_DESCRIPTION_LENGTH
  ) {
    return {
      error: `Description must be text of at most ${MAX_DESCRIPTION_LENGTH} characters`,
    };
  }

  if (
    !Array.isArray(techStack) ||
    techStack.length > MAX_TECH_ITEMS ||
    techStack.some(
      (tech) =>
        typeof tech !== "string" ||
        !tech.trim() ||
        tech.trim().length > MAX_TECH_LENGTH
    )
  ) {
    return {
      error: `Tech stack must be a list of up to ${MAX_TECH_ITEMS} technology names`,
    };
  }

  return {
    fields: {
      name: name.trim(),
      description: description.trim(),
      techStack: [
        ...new Set(techStack.map((tech) => tech.trim())),
      ],
    },
  };
};

export const createProject = async (req, res) => {
  try {
    const { fields, error } = validateNewProject(
      req.body ?? {}
    );

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    // status is never taken from the client; new projects
    // always start as "active" (the schema default)
    const project = await Project.create({
      user: req.user.userId,
      ...fields,
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      project,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Failed to create project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET ALL PROJECTS
// ======================================================

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get Projects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET PROJECT BY ID
// ======================================================

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      project,
    });
  } catch (error) {
    console.error("Get Project By ID Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// GET PROJECT FILES
// ======================================================

export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    }).select("name files");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.status(200).json({
      success: true,
      projectId: project._id,
      projectName: project.name,
      files: project.files || [],
    });
  } catch (error) {
    console.error("Get Project Files Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch project files",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// DOWNLOAD PROJECT
// ======================================================

export const downloadProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectPath = path.join(
      process.cwd(),
      "generated-projects",
      id.toString()
    );

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        message: "Generated project files not found",
      });
    }

    res.attachment(
      `${project.name || "generated-project"}.zip`
    );

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    archive.on("error", (error) => {
      console.error("Archive Error:", error);
      res.destroy(error);
    });

    archive.on("warning", (warning) => {
      console.warn("Archive Warning:", warning.message);
    });

    archive.pipe(res);

    // Source files only. Dependency / build folders are skipped
    // without being read: node_modules installed by Docker contains
    // Linux symlinks that cannot be read on Windows and stalled the
    // download. Secret .env files are never included.
    archive.glob("**/*", {
      cwd: projectPath,
      dot: true,
      skip: DOWNLOAD_SKIPPED_DIRECTORIES,
      // .env and .env.* (but keep .env.example)
      ignore: ["**/.env", "**/.env.!(example)", "**/*.tmp"],
    });

    await archive.finalize();
  } catch (error) {
    console.error("Download Project Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to download project",
        ...errorDetails(error),
      });
    }
  }
};

// ======================================================
// RUN PROJECT
// ======================================================

export const runProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const projectPath = path.join(
      process.cwd(),
      "generated-projects",
      id.toString()
    );

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({
        success: false,
        message: "Generated project files not found",
      });
    }

    console.log(
      `Starting Runner Agent for project: ${id}`
    );

    // =====================================
    // Runtime Auto-Fixer
    // =====================================

    const MAX_RUNTIME_FIX_ATTEMPTS = 3;

    let runtimeFixAttempt = 0;
    let runnerResult = null;

    while (
      runtimeFixAttempt < MAX_RUNTIME_FIX_ATTEMPTS
    ) {
      try {
        runtimeFixAttempt++;

        console.log(
          `🚀 Running project attempt ${runtimeFixAttempt}/${MAX_RUNTIME_FIX_ATTEMPTS}`
        );

        runnerResult =
          await runProjectInDocker(id);

        console.log(
          "✅ Project started successfully."
        );

        return res.status(200).json({
          success: true,
          message:
            runtimeFixAttempt === 1
              ? "Project started successfully"
              : "Project fixed and started successfully",
          projectId: project._id,
          runner: runnerResult,
          runtimeFixAttempts:
            runtimeFixAttempt - 1,
        });
      } catch (error) {
        console.error(
          `❌ Runtime Error on attempt ${runtimeFixAttempt}:`,
          error.message
        );

        // No more attempts
        if (
          runtimeFixAttempt >=
          MAX_RUNTIME_FIX_ATTEMPTS
        ) {
          throw error;
        }

        console.log(
          "🔧 Starting Runtime Fixer..."
        );

        // =====================================
        // Parse Runtime Error
        // =====================================

        let runtimeError;

        try {
          runtimeError = JSON.parse(
            error.message
          );
        } catch {
          runtimeError = {
            type: "RUNTIME_ERROR",
            message: error.message,
          };
        }

        // =====================================
        // Sync current disk files to MongoDB
        // =====================================

        await syncProjectFiles(id);

        // Get latest project from MongoDB
        const latestProject =
          await Project.findById(id);

        if (!latestProject) {
          throw new Error(
            "Project not found while running Runtime Fixer"
          );
        }

        // =====================================
        // Call Runtime Fixer
        // =====================================

        const fixedProject =
          await fixProject({
            projectName:
              latestProject.name,

            description:
              latestProject.description || "",

            techStack:
              latestProject.techStack || [],

            errors: [runtimeError],

            files:
              latestProject.files || [],
          });

        if (
          !fixedProject ||
          !Array.isArray(
            fixedProject.files
          )
        ) {
          throw new Error(
            "Runtime Fixer returned invalid response"
          );
        }

        console.log(
          "🛠 Runtime Fixer modified files:",
          fixedProject.files.map(
            (file) => file.path
          )
        );

        // =====================================
        // Update MongoDB
        // =====================================

        const existingFiles = new Map(
          (
            latestProject.files || []
          ).map((file) => [
            file.path,
            file.content,
          ])
        );

        for (const file of fixedProject.files) {
          if (
            !file.path ||
            typeof file.content !==
              "string"
          ) {
            continue;
          }

          existingFiles.set(
            file.path,
            file.content
          );
        }

        latestProject.files =
          Array.from(
            existingFiles,
            ([filePath, content]) => ({
              path: filePath,
              content,
            })
          );

        await latestProject.save();

        // =====================================
        // Write Fixed Files to Disk
        // =====================================

        await writeProjectFiles(
          id,
          fixedProject.files
        );

        console.log(
          "✅ Runtime Fixer changes written to disk."
        );
      }
    }
  } catch (error) {
    console.error(
      "Run Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to run project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// DELETE PROJECT
// ======================================================

export const deleteProject = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Project ID is required",
      });
    }

    // Find project
    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    // =====================================
    // Delete generated project from disk
    // =====================================

    const generatedProjectsRoot = path.resolve(
      process.cwd(),
      "generated-projects"
    );

    const projectRoot = path.resolve(
      generatedProjectsRoot,
      id.toString()
    );

    // Security check
    if (
      projectRoot === generatedProjectsRoot ||
      !projectRoot.startsWith(
        generatedProjectsRoot + path.sep
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid project path",
      });
    }

    // Stop and remove the project's Docker container (and its
    // node_modules volumes) before deleting the mounted folder.
    // stopProject ignores "container not running".
    await stopProject(id);

    try {
      await fsPromises.rm(projectRoot, {
        recursive: true,
        force: true,
      });
    } catch (fileError) {
      console.error(
        "Generated project deletion error:",
        fileError
      );
    }

    // =====================================
    // Delete project from MongoDB
    // =====================================

    await Project.findByIdAndDelete(id);

    // Keep a record for the History page. The project is already
    // deleted, so a failure here is logged but not reported as an error.
    try {
      await DeletedProject.create({
        user: project.user,
        projectId: project._id,
        name: project.name,
        description: project.description,
        techStack: project.techStack,
        status: project.status,
        projectCreatedAt: project.createdAt,
      });
    } catch (historyError) {
      console.error(
        "Deleted project history error:",
        historyError
      );
    }

    return res.status(200).json({
      success: true,
      message: "Project deleted successfully",
      projectId: id,
    });
  } catch (error) {
    console.error(
      "Delete Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete project",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// DELETED PROJECTS (HISTORY)
// ======================================================

export const getDeletedProjects = async (req, res) => {
  try {
    const projects = await DeletedProject.find({
      user: req.user.userId,
    })
      .sort({ deletedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: projects.length,
      projects,
    });
  } catch (error) {
    console.error(
      "Get Deleted Projects Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch project history",
      ...errorDetails(error),
    });
  }
};

// ======================================================
// MODIFY PROJECT
// ======================================================

export const modifyProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { userRequest } = req.body;

    if (!userRequest) {
      return res.status(400).json({
        success: false,
        message: "Modification request is required",
      });
    }

    const project = await Project.findOne({
      _id: id,
      user: req.user.userId,
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    console.log(`Modifying project: ${id}`);
    console.log(`User request: ${userRequest}`);

    // ==================================================
    // FIND PROBLEMS IN THE CURRENT PROJECT
    // ==================================================

    // A request like "fix the login" says nothing about the cause;
    // the validator's findings tell the Modify agent what is broken
    const initialValidation = validateProject({
      files: project.files || [],
    });

    if (initialValidation.errors.length > 0) {
      console.log(
        "Problems found before modification:",
        initialValidation.errors
      );
    }

    // ==================================================
    // SEND EXISTING PROJECT TO AI
    // ==================================================

    // UI requests get the design system and may only restyle
    // presentational frontend files
    const hasWebUi = (project.files || []).some((file) =>
      /^frontend\/|(^|\/)index\.html$/.test(
        String(file.path || "").replace(/\\/g, "/")
      )
    );

    const uiChange = hasWebUi && isUiRequest(userRequest);

    if (uiChange) {
      console.log("UI modification: applying the UI design system");
    }

    const modifiedProject =
      await modifyProjectService({
        projectName: project.name,
        description: project.description || "",
        techStack: project.techStack || [],
        files: project.files || [],
        userRequest,
        knownProblems: initialValidation.errors,
        uiChange,
      });

    if (
      !modifiedProject ||
      !Array.isArray(modifiedProject.files)
    ) {
      throw new Error(
        "AI returned an invalid modification response"
      );
    }

    // ==================================================
    // PROTECTED FILES
    // ==================================================

    const protectedFiles = new Set([
      "package.json",
      "package-lock.json",
      "npm-shrinkwrap.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "vite.config.js",
      "vite.config.ts",
      "tsconfig.json",
      "eslint.config.js",
      ".eslintrc",
      "tailwind.config.js",
      "postcss.config.js",
      "Dockerfile",
      "docker-compose.yml",
      ".env",
    ]);

    // ==================================================
    // CHECK WHETHER A FILE IS PROTECTED
    // ==================================================

    const isProtectedPath = (filePath) => {
      const normalizedPath = filePath.replace(
        /\\/g,
        "/"
      );

      const fileName =
        normalizedPath.split("/").pop();

      return protectedFiles.has(fileName);
    };

    // Apply AI output (Modify agent or Fixer) to the project files,
    // skipping protected files; returns the paths that were applied
    const applyFiles = (aiFiles = []) => {
      const allowed = aiFiles.filter(
        (file) =>
          file?.path &&
          typeof file.content === "string" &&
          !isProtectedPath(file.path)
      );

      const updates = new Map(
        allowed.map((file) => [file.path, file.content])
      );

      const existingPaths = new Set(
        project.files.map((file) => file.path)
      );

      project.files = project.files.map((file) =>
        updates.has(file.path)
          ? { path: file.path, content: updates.get(file.path) }
          : file
      );

      for (const file of allowed) {
        if (!existingPaths.has(file.path)) {
          project.files.push({
            path: file.path,
            content: file.content,
          });
        }
      }

      return allowed.map((file) => file.path);
    };

    console.log(
      "AI returned files:",
      modifiedProject.files.map(
        (file) => file.path
      )
    );

    // A UI change may only touch presentation files: React sources,
    // templates/static of basic Python/Java web apps, or the root
    // .html/.css/.js files of a static site
    const isPresentationFile = (filePath) =>
      /^frontend\/src\/|^templates\/|^static\/|^[^/]+\.(html|css|js)$/.test(
        filePath
      );

    const modificationFiles = uiChange
      ? modifiedProject.files.filter((file) => {
          const allowed = isPresentationFile(
            String(file?.path || "").replace(/\\/g, "/")
          );

          if (!allowed) {
            console.warn(
              `UI modification: ignoring non-presentation file ${file?.path}`
            );
          }

          return allowed;
        })
      : modifiedProject.files;

    const changedFiles = new Set(
      applyFiles(modificationFiles)
    );

    console.log(
      "Allowed modified files:",
      [...changedFiles]
    );

    // ==================================================
    // STATIC VALIDATION + FIXER (BEFORE SAVING)
    // ==================================================

    const MAX_MODIFY_FIX_ATTEMPTS = 2;

    let validation = validateProject({
      files: project.files,
    });

    for (
      let attempt = 1;
      !validation.valid &&
      attempt <= MAX_MODIFY_FIX_ATTEMPTS;
      attempt++
    ) {
      console.log(
        `Fixer after modification ${attempt}/${MAX_MODIFY_FIX_ATTEMPTS}:`,
        validation.errors
      );

      try {
        const fixResult = await fixProject({
          projectName: project.name,
          description: project.description || "",
          techStack: project.techStack || [],
          errors: validation.errors,
          files: project.files,
        });

        if (!fixResult || !Array.isArray(fixResult.files)) {
          throw new Error("Invalid Fixer response");
        }

        for (const filePath of applyFiles(fixResult.files)) {
          changedFiles.add(filePath);
        }
      } catch (fixError) {
        console.error(
          "Fixer after modification failed:",
          fixError.message
        );
        break;
      }

      validation = validateProject({
        files: project.files,
      });
    }

    // ==================================================
    // SAVE TO MONGODB + WRITE FILES TO DISK
    // ==================================================

    await project.save();

    await writeProjectFiles(
      project._id,
      project.files
    );

    console.log(
      "Modified files written to disk and saved to MongoDB"
    );

    // Basic file checks on disk (empty files, missing folder)
    const validationResult =
      await modifyValidatorService(
        project._id
      );

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message:
          "Modified project validation failed",
        errors: validationResult.errors,
      });
    }

    // ==================================================
    // RESTART + RUNTIME CHECK (LOGIN SMOKE TEST)
    // ==================================================

    const MAX_MODIFY_RUNTIME_ATTEMPTS = 2;

    let runnerResult = null;
    let runtimeError = null;

    for (
      let attempt = 1;
      attempt <= MAX_MODIFY_RUNTIME_ATTEMPTS + 1;
      attempt++
    ) {
      try {
        await stopProject(project._id);

        runnerResult = await runProjectInDocker(
          project._id
        );

        const smoke = await runAuthSmokeTest({
          files: project.files,
          previewUrl: runnerResult?.frontend?.previewUrl,
        });

        if (!smoke.skipped && !smoke.success) {
          throw new Error(
            `Authentication smoke test failed: ${smoke.error}`
          );
        }

        runtimeError = null;
        break;
      } catch (error) {
        runtimeError = error.message;

        console.error(
          `Runtime check after modification failed (${attempt}):`,
          runtimeError.slice(0, 500)
        );

        if (attempt > MAX_MODIFY_RUNTIME_ATTEMPTS) {
          break;
        }

        try {
          let errorDetail;

          try {
            errorDetail = JSON.parse(runtimeError);
          } catch {
            errorDetail = {
              type: "RUNTIME_ERROR",
              message: runtimeError,
            };
          }

          const fixResult = await fixProject({
            projectName: project.name,
            description: project.description || "",
            techStack: project.techStack || [],
            errors: [errorDetail],
            files: project.files,
          });

          if (!fixResult || !Array.isArray(fixResult.files)) {
            throw new Error("Invalid Fixer response");
          }

          for (const filePath of applyFiles(fixResult.files)) {
            changedFiles.add(filePath);
          }

          await project.save();
          await writeProjectFiles(project._id, project.files);

          validation = validateProject({
            files: project.files,
          });
        } catch (fixError) {
          console.error(
            "Runtime Fixer after modification failed:",
            fixError.message
          );
          break;
        }
      }
    }

    // ==================================================
    // RESPONSE
    // ==================================================

    const remainingProblems = [
      ...validation.errors,
      ...(runtimeError ? [runtimeError] : []),
    ];

    if (remainingProblems.length > 0) {
      console.warn(
        "Modification saved, but problems remain:",
        remainingProblems
      );

      return res.status(422).json({
        success: false,
        message: `The changes were saved, but ${remainingProblems.length} problem(s) remain: ${remainingProblems
          .slice(0, 3)
          .map((problem) => problem.slice(0, 300))
          .join(" | ")}`,
        projectId: project._id,
        modifiedFiles: [...changedFiles],
        errors: remainingProblems,
        runner: runnerResult,
      });
    }

    console.log(
      "Updated project validated and started successfully"
    );

    return res.status(200).json({
      success: true,
      message:
        "Project modified and restarted successfully",

      projectId: project._id,

      modifiedFiles: [...changedFiles],

      validation,

      runner: runnerResult,
    });
  } catch (error) {
    console.error(
      "Modify Project Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to modify project",
      ...errorDetails(error),
    });
  }
};