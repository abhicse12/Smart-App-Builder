import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      default: "active",
    },

    files: [
      {
        path: {
          type: String,
          required: true,
        },

        // Empty content is valid (e.g. a Python package's __init__.py);
        // "required" would reject "" , so only a missing value is refused
        content: {
          type: String,
          default: "",
          validate: {
            validator: (value) => typeof value === "string",
            message: "File content must be a string",
          },
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Project", projectSchema);