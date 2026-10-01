const KEYS = {
  plans: "sip_plans",
  purchases: "sip_purchases",
  auth: "sip_auth",
};

function read(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storageService = {
  getPlans: () => read(KEYS.plans, []),
  savePlans: (plans) => write(KEYS.plans, plans),

  getPurchases: () => read(KEYS.purchases, []),
  savePurchases: (purchases) => write(KEYS.purchases, purchases),

  getAuth: () => read(KEYS.auth, null),
  saveAuth: (auth) => write(KEYS.auth, auth),

  clearAll: () => Object.values(KEYS).forEach((key) => localStorage.removeItem(key)),
};
