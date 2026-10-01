import { useState } from "react";
import { isValidPin } from "../utils/pinUtils";
import "./Auth.css";

export default function SetupPin({ onCreate }) {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();

    if (!isValidPin(pin)) {
      setError("PIN must contain 4 to 6 digits.");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      return;
    }

    await onCreate(pin);
  }

  return (
    <main className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">₹</div>
        <p className="eyebrow">WELCOME</p>
        <h1>Create your PIN</h1>
        <p className="auth-copy">
          Your investment data stays on this device. Choose a 4–6 digit PIN.
        </p>

        <form onSubmit={submit}>
          <div className="auth-field">
            <label>PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength="6"
              value={pin}
              onChange={(event) =>
                setPin(event.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          <div className="auth-field">
            <label>Confirm PIN</label>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength="6"
              value={confirmPin}
              onChange={(event) =>
                setConfirmPin(event.target.value.replace(/\D/g, ""))
              }
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button className="btn auth-submit">Create PIN</button>
        </form>
      </div>
    </main>
  );
}
