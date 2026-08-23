import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
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

        content: {
          type: String,
          required: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Project", projectSchema);