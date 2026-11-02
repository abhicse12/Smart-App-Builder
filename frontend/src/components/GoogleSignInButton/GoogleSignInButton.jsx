import { useNavigate } from "react-router-dom";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { API_BASE_URL } from "@/lib/api";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// "Continue with Google" for the login and signup pages. Google gives us
// an ID token; the backend verifies it and sets the normal session cookie.
function GoogleSignInButton() {
  const navigate = useNavigate();

  const handleSuccess = async ({ credential }) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/auth/google`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ credential }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Google sign-in failed");
        return;
      }

      navigate("/dashboard");
    } catch (error) {
      console.error("Google Login Error:", error);
      alert("Something went wrong");
    }
  };

  // Email/password login keeps working when Google is not configured
  if (!GOOGLE_CLIENT_ID) {
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex justify-center">
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={() => alert("Google sign-in failed")}
          text="continue_with"
          shape="pill"
        />
      </div>
    </GoogleOAuthProvider>
  );
}

export default GoogleSignInButton;
