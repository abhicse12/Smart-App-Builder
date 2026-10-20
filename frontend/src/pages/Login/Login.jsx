import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import AuthLayout, {
  authButtonClass,
  authIconClass,
  authInputClass,
  authLabelClass,
} from "@/components/AuthLayout/AuthLayout";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Login failed");
        return;
      }

      console.log("Login successful:", data);

      navigate("/dashboard");
    } catch (error) {
      console.error("Login Error:", error);
      alert("Something went wrong");
    }
  };

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Login to continue building your applications."
    >
      <form onSubmit={handleLogin} className="space-y-5">

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
              onChange={(e) => setEmail(e.target.value)}
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className={authInputClass}
            />
          </div>
        </div>

        {/* Login Button */}
        <button type="submit" className={authButtonClass}>
          Login
        </button>
      </form>

      {/* Signup */}
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-medium text-primary hover:underline"
        >
          Create account
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;