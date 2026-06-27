import "./header.css";
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useVoiceAnimation } from "../../hooks/useVoiceAnimation";
import { useCharacterState } from "../avatar/AvatarStateContext";
import { CharacterState } from "../avatar/three/avatarRuntime";

function Header({
  backBtn,
  settingsBtn,
  fixed,
  callBtn = false,
  toggleCallMode,
  callMode,
  analyser,
  isMenuOpen: isMenuOpenProp,
  setIsMenuOpen: setIsMenuOpenProp,
  config = {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPagePath = location.pathname;
  const volume = useVoiceAnimation(analyser);
  const { characterState, setCharacterState } = useCharacterState();

  const [isMenuOpenInternal, setIsMenuOpenInternal] = useState(false);
  const isMenuOpen =
    isMenuOpenProp !== undefined ? isMenuOpenProp : isMenuOpenInternal;
  const setIsMenuOpen =
    setIsMenuOpenProp !== undefined ? setIsMenuOpenProp : setIsMenuOpenInternal;
  const [devMode, setDevMode] = useState(false);
  const [holdTimer, setHoldTimer] = useState(null);
  const [devFlash, setDevFlash] = useState(false);

  const handleBackClick = () => {
    if (
      currentPagePath === "/settings" ||
      currentPagePath === "/chat-history"
    ) {
      navigate("/settings-nav");
    } else {
      navigate("/");
    }
  };

  const handleToggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCallModeClick = () => {
    toggleCallMode();
  };

  const startDevHold = () => {
    const timer = setTimeout(() => {
      setDevFlash(true);

      if (devMode) {
        setDevMode(false);
        console.log("dev mode disabled");
      } else {
        setDevMode(true);

        console.log("dev mode enabled");
      }

      setTimeout(() => {
        setDevFlash(false);
      }, 1000);
    }, 3000);

    setHoldTimer(timer);
  };

  const stopDevHold = () => {
    clearTimeout(holdTimer);
  };

  const updateConfig = async (nextConfig) => {
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextConfig),
      });
      window.dispatchEvent(
        new CustomEvent("app-config-updated", { detail: nextConfig }),
      );
    } catch (err) {
      console.error("Error updating config from header:", err);
    }
  };

  const handleToggleStealth = () => {
    const nextConfig = { ...config, stealth_mode: !config.stealth_mode };
    updateConfig(nextConfig);
  };

  const handleToggleVoice = () => {
    const nextConfig = { ...config, tts_enabled: !config.tts_enabled };
    updateConfig(nextConfig);
  };

  const handleToggleDark = () => {
    const nextConfig = { ...config, is_dark: !config.is_dark };
    updateConfig(nextConfig);
  };

  const handleToggleOrbitControls = () => {
    const nextConfig = {
      ...config,
      orbit_controls_enabled:
        config.orbit_controls_enabled !== false ? false : true,
    };
    updateConfig(nextConfig);
  };

  const handleToggleFreeCam = () => {
    const nextConfig = {
      ...config,
      free_cam_enabled: !config.free_cam_enabled,
    };

    updateConfig(nextConfig);
  };

  const modes = Object.values(CharacterState);

  function handleToggleCharacterMode() {
    const currentIndex = modes.indexOf(characterState);

    const nextIndex = (currentIndex + 1) % modes.length;

    setCharacterState(modes[nextIndex]);
  }

  return (
    <>
      <div
        className={`header ${fixed ? "header--fixed" : ""} ${
          window.electronAPI?.isElectron ? "header--draggable" : ""
        } ${isMenuOpen ? "menu-open" : ""}`}
      >
        {backBtn && (
          <button className="back-button" onClick={handleBackClick}></button>
        )}

        {callBtn && !backBtn && (
          <button
            className={`hamburger-manue-btn ${devFlash ? "dev-flash" : ""}`}
            onClick={handleToggleMenu}
            onMouseDown={startDevHold}
            onMouseUp={stopDevHold}
            onMouseLeave={stopDevHold}
            onTouchStart={startDevHold}
            onTouchEnd={stopDevHold}
          >
            <svg
              width="46"
              height="35"
              viewBox="0 0 46 35"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="46" height="9" rx="4" fill="currentColor" />
              <rect y="13" width="46" height="9" rx="4" fill="currentColor" />
              <rect y="26" width="46" height="9" rx="4" fill="currentColor" />
            </svg>
          </button>
        )}

        {settingsBtn && (
          <button
            className="settings-button"
            onClick={() => navigate("/settings-nav")}
          ></button>
        )}

        {isMenuOpen && (
          <div
            className="menu-overlay"
            onClick={handleToggleMenu}
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <div className="menu-content" onClick={(e) => e.stopPropagation()}>
              <button className="menu-item" onClick={handleCallModeClick}>
                <div
                  className="menu-item-icon"
                  style={{
                    color: callMode ? "var(--theme-active)" : "inherit",
                  }}
                >
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 46 46"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.2388 10.1893L20.4827 12.4183C21.6053 14.4298 21.1547 17.0686 19.3866 18.8366C19.3866 18.8366 17.2422 20.9814 21.1304 24.8697C25.0174 28.7567 27.1635 26.6135 27.1635 26.6135C28.9316 24.8454 31.5703 24.3948 33.5818 25.5174L35.8107 26.7613C38.8482 28.4564 39.2068 32.716 36.5371 35.3859C34.9329 36.9902 32.9675 38.2385 30.795 38.3207C27.1378 38.4595 20.9268 37.5339 14.6965 31.3036C8.46625 25.0733 7.54065 18.8624 7.67931 15.2051C7.76167 13.0326 9.00995 11.0673 10.6142 9.46304C13.284 6.79322 17.5437 7.15195 19.2388 10.1893Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span>Call Mode</span>
              </button>

              <button className="menu-item" onClick={handleToggleOrbitControls}>
                <div
                  className="menu-item-icon"
                  style={{
                    color:
                      config.orbit_controls_enabled !== false
                        ? "var(--theme-active)"
                        : "inherit",
                  }}
                >
                  <svg
                    viewBox="0 0 751 751"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M376 432.575C409.427 432.575 441.485 419.296 465.122 395.659C488.759 372.023 502.038 339.965 502.038 306.538C502.038 273.11 488.759 241.052 465.122 217.416C441.485 193.779 409.427 180.5 376 180.5C342.573 180.5 310.515 193.779 286.878 217.416C263.241 241.052 249.962 273.11 249.962 306.538C249.962 339.965 263.241 372.023 286.878 395.659C310.515 419.296 342.573 432.575 376 432.575ZM376 487.95C208.425 487.95 101 580.425 101 625.45V709.525H651V625.45C651 571 549.3 487.95 376 487.95Z"
                      fill="currentColor"
                    />
                    <path
                      d="M254.962 147.934L148.238 215.736L142.882 89.4103L254.962 147.934Z"
                      fill="currentColor"
                    />
                    <path
                      d="M495.093 147.934L601.816 215.736L607.173 89.4103L495.093 147.934Z"
                      fill="currentColor"
                    />
                    <path
                      d="M196.004 127.176C196.004 127.176 227.365 96.9502 250.504 81.6756C267.06 70.7465 276.53 64.4058 295.004 57.1756C314.453 49.5636 326.258 47.0871 347.004 44.6756C366.981 42.3535 378.507 42.5312 398.504 44.6756C417.352 46.6969 427.978 48.8086 446.004 54.6756C464.121 60.5725 473.996 65.1621 490.504 74.6756C504.96 83.0065 512.746 88.4238 525.504 99.1756C534.164 106.474 538.432 111.232 546.504 119.176C550.44 123.05 556.504 129.176 556.504 129.176"
                      stroke="currentColor"
                      stroke-width="41"
                    />
                  </svg>
                </div>
                <span>Orbit Controls</span>
              </button>

              <button className="menu-item" onClick={handleToggleStealth}>
                <div
                  className="menu-item-icon"
                  style={{
                    color: config.stealth_mode
                      ? "var(--theme-active)"
                      : "inherit",
                  }}
                >
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C7.58 2 4 5.58 4 10V22L7 19L10 22L12 20L14 22L17 19L20 22V10C20 5.58 16.42 2 12 2ZM12 14C10.9 14 10 13.1 10 12C10 10.9 10.9 10 12 10C13.1 10 14 10.9 14 12C14 13.1 13.1 14 12 14Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span>Stealth Mode</span>
              </button>

              <button className="menu-item" onClick={handleToggleVoice}>
                <div
                  className="menu-item-icon"
                  style={{
                    color: config.tts_enabled
                      ? "var(--theme-active)"
                      : "inherit",
                  }}
                >
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 33 33"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M19.4121 1.9422V31.0604H16.0985L8.33362 23.2955H2.91182C1.30642 23.2955 0 21.9891 0 20.3837V12.6189C0 11.0135 1.30642 9.70705 2.91182 9.70705H8.33362L16.0985 1.9422H19.4121ZM17.4709 3.88341H16.9021L9.70606 11.0795V21.9231L16.9021 29.1191H17.4709V3.88342V3.88341ZM28.7371 6.20568C31.4859 8.95637 33 12.6117 33 16.5019C33 20.3901 31.4859 24.0454 28.7371 26.7961L27.3647 25.4237C29.7485 23.0399 31.0588 19.8718 31.0588 16.5019C31.0588 13.13 29.7485 9.96192 27.3647 7.57812L28.7371 6.20568ZM24.6274 10.3263C26.2716 11.9938 27.1762 14.1874 27.1762 16.5013C27.1762 18.8152 26.2716 21.0088 24.6274 22.6763L23.2433 21.3135C24.5284 20.011 25.235 18.3027 25.235 16.5013C25.235 14.6998 24.5284 12.9916 23.2433 11.689L24.6274 10.3263ZM7.76485 11.6483H2.91182C2.37798 11.6483 1.94121 12.0831 1.94121 12.6189V20.3837C1.94121 20.9195 2.37798 21.3543 2.91182 21.3543H7.76485V11.6483Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span>Voice Mode</span>
              </button>

              <button className="menu-item" onClick={handleToggleDark}>
                <div
                  className="menu-item-icon"
                  style={{
                    color: config.is_dark ? "var(--theme-active)" : "inherit",
                  }}
                >
                  <svg
                    width="46"
                    height="46"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 3C10.45 3 8.95 3.32 7.6 3.9C11.38 5.48 14 9.14 14 13.4C14 17.66 11.38 21.32 7.6 22.9C8.95 23.48 10.45 23.8 12 23.8C17.96 23.8 22.8 18.96 22.8 13C22.8 7.04 17.96 2.2 12 2.2V3Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <span>Dark Mode</span>
              </button>

              {devMode && (
                <>
                  <button className="menu-item" onClick={handleToggleFreeCam}>
                    <div
                      className="menu-item-icon"
                      style={{
                        color: config.free_cam_enabled
                          ? "var(--theme-active)"
                          : "inherit",
                      }}
                    >
                      <svg
                        fill="currentColor"
                        width="800px"
                        height="800px"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M1.293,11.293l4-4A1,1,0,1,1,6.707,8.707L3.414,12l3.293,3.293a1,1,0,1,1-1.414,1.414l-4-4A1,1,0,0,1,1.293,11.293Zm17.414-4a1,1,0,1,0-1.414,1.414L20.586,12l-3.293,3.293a1,1,0,1,0,1.414,1.414l4-4a1,1,0,0,0,0-1.414ZM13.039,4.726l-4,14a1,1,0,0,0,.686,1.236A1.053,1.053,0,0,0,10,20a1,1,0,0,0,.961-.726l4-14a1,1,0,1,0-1.922-.548Z" />
                      </svg>
                    </div>
                    <span>Free Cam</span>
                  </button>

                  <button
                    className="menu-item"
                    onClick={handleToggleCharacterMode}
                  >
                    <div
                      className="menu-item-icon"
                      style={{
                        color: "var(--theme-active)",
                      }}
                    >
                      <svg
                        fill="currentColor"
                        width="800px"
                        height="800px"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path d="M1.293,11.293l4-4A1,1,0,1,1,6.707,8.707L3.414,12l3.293,3.293a1,1,0,1,1-1.414,1.414l-4-4A1,1,0,0,1,1.293,11.293Zm17.414-4a1,1,0,1,0-1.414,1.414L20.586,12l-3.293,3.293a1,1,0,1,0,1.414,1.414l4-4a1,1,0,0,0,0-1.414ZM13.039,4.726l-4,14a1,1,0,0,0,.686,1.236A1.053,1.053,0,0,0,10,20a1,1,0,0,0,.961-.726l4-14a1,1,0,1,0-1.922-.548Z" />
                      </svg>
                    </div>

                    <span>Mode: {characterState}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Header;
