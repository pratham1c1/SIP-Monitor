import { useState } from "react";
import "./Auth.css";

export default function Login({ onLogin }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    const valid = await onLogin(pin);

    if (!valid) {
      setError("Incorrect PIN.");
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">₹</div>
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Enter your PIN</h1>
        <p className="auth-copy">Unlock your local investment tracker.</p>

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>PIN</label>
            <input
              autoFocus
              className="input"
              type="password"
              inputMode="numeric"
              maxLength="6"
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn auth-submit">Unlock</button>
        </form>

        <button
          className="forgot-button"
          onClick={() =>
            alert(
              "PIN recovery is reserved for a future backend. No Gmail credentials are stored in this app."
            )
          }
        >
          Forgot PIN?
        </button>
      </div>
    </main>
  );
}
