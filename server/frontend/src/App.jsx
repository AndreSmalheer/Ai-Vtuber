import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Home from "./pages/Home/Home";
import Settings from "./pages/Settings/Settings";
import GeneralSettings from "./pages/GeneralSettings/GeneralSettings";
import ChatHistory from "./pages/ChatHistory/ChatHistory";
import Header from "./components/header/header";
import Avatar from "./components/avatar/avatar";

function App() {
  const [lipSyncState, setLipSyncState] = useState({
    isPlaying: false,
    analyser: null,
    frequencyData: null,
    timeDomainData: null,
  });
  const location = useLocation();
  const [config, setConfig] = useState({});
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark",
  );

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [isDark]);

  useEffect(() => {
    const handleThemeUpdate = (event) => {
      if (event.detail !== undefined) {
        setIsDark(event.detail);
      }
    };

    window.addEventListener("theme-updated", handleThemeUpdate);
    return () => {
      window.removeEventListener("theme-updated", handleThemeUpdate);
    };
  }, []);

  useEffect(() => {
    const loadConfig = () => {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => {
          setConfig((prev) => ({ ...prev, ...data }));
        })
        .catch((err) => console.error("Error fetching config:", err));
    };

    loadConfig();
  }, [location.pathname]);

  useEffect(() => {
    const handleConfigUpdate = (event) => {
      if (event.detail) {
        setConfig((prev) => ({ ...prev, ...event.detail }));
      }
    };

    window.addEventListener("app-config-updated", handleConfigUpdate);
    return () => {
      window.removeEventListener("app-config-updated", handleConfigUpdate);
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        fetch("/api/leave", { method: "POST" }).catch(() => {});
      } else {
        checkWelcomeBack();
      }
    };

    const checkWelcomeBack = () => {
      fetch("/api/welcome-check")
        .then((res) => res.json())
        .then((data) => {
          if (data.greet) {
            if (config.enable_welcome_message ?? false) {
              window.dispatchEvent(new CustomEvent("ai-trigger-welcome"));
            }
          }
        })
        .catch((err) => console.error("Error checking welcome back:", err));
    };

    checkWelcomeBack();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [config]);

  const showAvatar = location.pathname === "/" && !config.stealth_mode;

  return (
    <div
      className={`main-content ${location.pathname === "/" ? "main-content--locked" : "main-content--scroll"}`}
    >
      <Avatar
        visible={showAvatar}
        avatarModel={config.avatar_model}
        lipSyncState={lipSyncState}
        orbitControlsEnabled={config.orbit_controls_enabled !== false}
        enableEffects={config.enable_effects}
        isDark={isDark}
      />

      <Routes>
        <Route
          path="/"
          element={
            <Home config={config} onAudioStateChange={setLipSyncState} />
          }
        />
        {/* This route acts as the settings navigation menu */}
        <Route
          path="/settings-nav"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} />
              <Settings /> {/* This component now acts as the menu */}
            </>
          }
        />
        {/* New routes for specific settings pages */}
        <Route
          path="/settings"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} fixed={true} />
              <GeneralSettings />
            </>
          }
        />
        <Route
          path="/chat-history"
          element={
            <>
              <Header backBtn={true} settingsBtn={false} fixed={true} />
              <ChatHistory />
            </>
          }
        />{" "}
      </Routes>
    </div>
  );
}

export default App;
