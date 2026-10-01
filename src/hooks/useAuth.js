import { useState } from "react";
import { storageService } from "../services/storageService";
import { hashPin } from "../utils/pinUtils";

export function useAuth() {
  const [auth, setAuth] = useState(() => storageService.getAuth());
  const [authenticated, setAuthenticated] = useState(false);

  async function createPin(pin) {
    const nextAuth = {
      pinHash: await hashPin(pin),
    };

    storageService.saveAuth(nextAuth);
    setAuth(nextAuth);
    setAuthenticated(true);
  }

  async function login(pin) {
    if (!auth?.pinHash) return false;

    const valid = (await hashPin(pin)) === auth.pinHash;
    setAuthenticated(valid);

    return valid;
  }

  return {
    hasPin: Boolean(auth?.pinHash),
    authenticated,
    createPin,
    login,
  };
}
