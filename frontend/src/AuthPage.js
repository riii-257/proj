import React, { useState } from "react";
import api from "./api";

export default function AuthPage({ onAuth }) {
  const [mode, setMode]       = useState("login"); // "login" | "register"
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const reset = () => { setError(""); setName(""); setEmail(""); setPass(""); setConfirm(""); };
  const switchMode = (m) => { setMode(m); reset(); };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (mode === "register") {
      if (!name.trim())               return setError("Please enter your name");
      if (password !== confirm)       return setError("Passwords do not match");
      if (password.length < 6)        return setError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const res = mode === "login"
        ? await api.login(email, password)
        : await api.register(name, email, password);

      if (res.error) { setError(res.error); setLoading(false); return; }

      localStorage.setItem("ds_token", res.token);
      localStorage.setItem("ds_user",  JSON.stringify(res.user));
      onAuth(res.user);
    } catch (err) {
      setError("Connection failed. Is the backend running?");
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
        </div>
        <h1 className="auth-title">DocuSearch</h1>
        <p className="auth-sub">
          {mode === "login" ? "Sign in to your account" : "Create a new account"}
        </p>

        {/* Tabs */}
        <div className="auth-tabs">
          <button className={mode === "login"    ? "active" : ""} onClick={() => switchMode("login")}>Sign In</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Register</button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text" placeholder="John Smith"
                value={name} onChange={e => setName(e.target.value)} required
              />
            </div>
          )}

          <div className="auth-field">
            <label>Email</label>
            <input
              type="email" placeholder="you@example.com"
              value={email} onChange={e => setEmail(e.target.value)} required
            />
          </div>

          <div className="auth-field">
            <label>Password</label>
            <div className="pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                placeholder={mode === "register" ? "Min. 6 characters" : "Your password"}
                value={password} onChange={e => setPass(e.target.value)} required
              />
              <button type="button" className="toggle-pass" onClick={() => setShowPass(p => !p)}>
                {showPass ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          {mode === "register" && (
            <div className="auth-field">
              <label>Confirm Password</label>
              <input
                type={showPass ? "text" : "password"} placeholder="Repeat password"
                value={confirm} onChange={e => setConfirm(e.target.value)} required
              />
            </div>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading
              ? <span className="btn-spinner" />
              : mode === "login" ? "Sign In" : "Create Account"
            }
          </button>
        </form>

        <p className="auth-switch">
          {mode === "login" ? (
            <>Don't have an account? <button onClick={() => switchMode("register")}>Register</button></>
          ) : (
            <>Already have an account? <button onClick={() => switchMode("login")}>Sign In</button></>
          )}
        </p>
      </div>

      {/* Background decoration */}
      <div className="auth-bg">
        <div className="auth-orb auth-orb1" />
        <div className="auth-orb auth-orb2" />
      </div>
    </div>
  );
}
