import mongoose from "mongoose";

const knowledgeChunkSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    embedding: {
      type: [Number],
      required: true,
    },

    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "KnowledgeChunk",
  knowledgeChunkSchema
);