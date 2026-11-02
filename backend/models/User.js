import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Accounts created with Google have no password
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
    },

    // Google's stable user id ("sub"); sparse so that many users
    // without Google login can coexist under the unique index
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;