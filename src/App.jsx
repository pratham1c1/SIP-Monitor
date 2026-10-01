import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { storageService } from "./services/storageService";
import Navbar from "./components/Navbar";
import Analyze from "./pages/Analyze";
import Plan from "./pages/Plan";
import Execution from "./pages/Execution";
import History from "./pages/History";
import Login from "./pages/Login";
import SetupPin from "./pages/SetupPin";
import "./App.css";

function ProtectedApp() {
  const [plans, setPlans] = useState(() => storageService.getPlans());
  const [purchases, setPurchases] = useState(() => storageService.getPurchases());

  useEffect(() => {
    storageService.savePlans(plans);
  }, [plans]);

  useEffect(() => {
    storageService.savePurchases(purchases);
  }, [purchases]);

  useEffect(() => {
    const internalPaths = new Set(["/", "/plan", "/execution", "/history"]);
    let lastInternalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (!window.history.state?.__sipTrackerEntry) {
      window.history.replaceState(
        { ...window.history.state, __sipTrackerEntry: true },
        "",
        window.location.href
      );
    }

    const handlePopState = () => {
      const path = window.location.pathname;

      if (!internalPaths.has(path)) {
        window.history.pushState(
          { ...window.history.state, __sipTrackerEntry: true },
          "",
          lastInternalUrl
        );
        return;
      }

      lastInternalUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-content">
        <Routes>
          <Route path="/" element={<Analyze plans={plans} purchases={purchases} />} />
          <Route path="/plan" element={<Plan plans={plans} setPlans={setPlans} />} />
          <Route
            path="/execution"
            element={
              <Execution
                plans={plans}
                purchases={purchases}
                setPurchases={setPurchases}
              />
            }
          />
          <Route path="/history" element={<History purchases={purchases} setPurchases={setPurchases} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const auth = useAuth();

  if (!auth.hasPin) return <SetupPin onCreate={auth.createPin} />;
  if (!auth.authenticated) return <Login onLogin={auth.login} />;

  return <ProtectedApp />;
}
