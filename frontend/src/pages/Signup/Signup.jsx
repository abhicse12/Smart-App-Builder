import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Mail, Lock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import AuthLayout, {
  authButtonClass,
  authIconClass,
  authInputClass,
  authLabelClass,
} from "@/components/AuthLayout/AuthLayout";

function Signup() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/auth/signup`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Signup failed");
        return;
      }
      console.log("Signup successful:", data);

      // Go to login page
      navigate("/login");
    } catch (error) {
      console.error("Signup Error:", error);

      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Create your account and start building applications with AI."
    >
      <form
        onSubmit={handleSignup}
        className="space-y-5"
      >

        {/* Name */}
        <div>
          <label className={authLabelClass}>
            Name
          </label>

          <div className="relative">
            <User className={authIconClass} />

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter your name"
              required
              className={authInputClass}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className={authLabelClass}>
            Email
          </label>

          <div className="relative">
            <Mail className={authIconClass} />

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your email"
              required
              className={authInputClass}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label className={authLabelClass}>
            Password
          </label>

          <div className="relative">
            <Lock className={authIconClass} />

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Create a password"
              required
              className={authInputClass}
            />
          </div>
        </div>

        {/* Button */}
        <button
          type="submit"
          disabled={loading}
          className={authButtonClass}
        >
          {loading
            ? "Creating Account..."
            : "Create Account"}
        </button>

      </form>

      {/* Login */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-primary hover:underline"
        >
          Login
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Signup;