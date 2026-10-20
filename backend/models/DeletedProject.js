import mongoose from "mongoose";

// Record of a project the user deleted (shown on the History page).
// The project itself is removed from the projects collection.
const deletedProjectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    techStack: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
    },

    projectCreatedAt: {
      type: Date,
    },

    deletedAt: {
      type: Date,
      default: Date.now,
    },
  }
);

export default mongoose.model("DeletedProject", deletedProjectSchema);
