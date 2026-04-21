import "./header.css";
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Header({ backBtn, settingsBtn, fixed }) {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPagePath = location.pathname;

  const handleBackClick = () => {
    if (currentPagePath === "/settings" || currentPagePath === "/chat-history") {
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
