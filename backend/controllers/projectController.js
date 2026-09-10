import Project from "../models/Project.js";
import fs from "fs";
import path from "path";
import { ZipArchive } from "archiver";

export const createProject = async (req, res) => {
  try {
    const { name, description, techStack, status } = req.body;

    const project = await Project.create({
      name,
      description,
      techStack,
      status,
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
      error: error.message,
    });
  }
};

export const getProjects = async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("Get Projects Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message,
    });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

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
      error: error.message,
    });
  }
};

export const getProjectFiles = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id).select("name files");

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
      error: error.message,
    });
  }
};

export const downloadProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

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

    res.attachment(`${project.name || "generated-project"}.zip`);

    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    archive.on("error", (error) => {
      console.error("Archive Error:", error);
      res.destroy(error);
    });

    archive.pipe(res);

    archive.directory(projectPath, false);

    await archive.finalize();

  } catch (error) {
    console.error("Download Project Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Failed to download project",
        error: error.message,
      });
    }
  }
};

export const runProject = async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findById(id);

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

    return res.status(200).json({
      success: true,
      message: "Project is ready to run",
      projectId: project._id,
      projectPath,
    });
  } catch (error) {
    console.error("Run Project Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to prepare project",
      error: error.message,
    });
  }
};