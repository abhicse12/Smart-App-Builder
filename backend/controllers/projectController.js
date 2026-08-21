import Project from "../models/Project.js";

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