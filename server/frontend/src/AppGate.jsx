import { useEffect, useState } from "react";
import App from "./App";
import Onboarding from "./pages/Onboarding/Onboarding";

export default function AppGate() {
  const [isFirstVisit, setIsFirstVisit] = useState(null);

  useEffect(() => {
    fetch("/api/onboarding/status")
      .then((res) => res.json())
      .then((data) => {
        setIsFirstVisit(!data.completed);
      })
      .catch((err) => {
        console.error("Error fetching onboarding status:", err);
        setIsFirstVisit(false);
      });
  }, []);

  const handleCompleteOnboarding = () => {
    fetch("/api/onboarding/complete", { method: "POST" })
      .then(() => setIsFirstVisit(false))
      .catch((err) => {
        console.error("Error completing onboarding:", err);
        setIsFirstVisit(false);
      });
  };

  if (isFirstVisit === null) {
    return null;
  }

  return isFirstVisit ? (
    <Onboarding setIsFirstVisit={handleCompleteOnboarding} />
  ) : (
    <App />
  );
}
