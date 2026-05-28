import "./header.css";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Header({
  backBtn,
  settingsBtn,
  fixed,
  callBtn = false,
  toggleCallMode,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPagePath = location.pathname;

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

  return (
    <>
      <div
        className={`header ${fixed ? "header--fixed" : ""} ${
          window.electronAPI?.isElectron ? "header--draggable" : ""
        }`}
      >
        {backBtn && (
          <button className="back-button" onClick={handleBackClick}></button>
        )}

        {callBtn && !backBtn && (
          <button className="call-btn" onClick={toggleCallMode}>
            <svg
              width="46"
              height="46"
              viewBox="0 0 46 46"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M19.2388 10.1893L20.4827 12.4183C21.6053 14.4298 21.1547 17.0685 19.3866 18.8366C19.3866 18.8366 17.2422 20.9814 21.1304 24.8697C25.0174 28.7567 27.1635 26.6135 27.1635 26.6135C28.9316 24.8454 31.5703 24.3948 33.5818 25.5174L35.8107 26.7613C38.8482 28.4564 39.2068 32.716 36.5371 35.3859C34.9329 36.9902 32.9675 38.2385 30.795 38.3207C27.1378 38.4595 20.9268 37.5339 14.6965 31.3036C8.46625 25.0733 7.54065 18.8624 7.67931 15.2051C7.76167 13.0326 9.00995 11.0673 10.6142 9.46304C13.284 6.79322 17.5437 7.15195 19.2388 10.1893Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}

        {settingsBtn && (
          <button
            className="settings-button"
            onClick={() => navigate("/settings-nav")}
          ></button>
        )}
      </div>
    </>
  );
}

export default Header;
