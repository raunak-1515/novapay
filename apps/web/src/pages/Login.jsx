import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // If the user is already logged in, instantly teleport them away from the auth pages!
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("userRole");
      if (token) {
        if (role === "admin") navigate("/admin");
        else navigate("/dashboard");
      }
    };

    // 1. Check immediately when the page loads
    checkAuth();

    // 2. Cross-Tab Sync: Check again if another tab logs in!
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, [navigate]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("userEmail", res.data.user.email);
      localStorage.setItem("userRole", res.data.user.role);
      if (res.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }

    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Login failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <div className="brand">
          <span className="brand-dot" />
          <span>Novapay</span>
        </div>

        <h2>Welcome back</h2>
        <p className="muted">Sign in to continue.</p>

        <form className="form" onSubmit={handleSubmit}>
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}

        <p className="muted" style={{ marginTop: 10 }}>
          New user? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
