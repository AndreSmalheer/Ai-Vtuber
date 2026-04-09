import "./header.css";
function Header({ backBtn, settingsBtn }) {
  function navigate(location) {
    window.location.href = location;
  }

  return (
    <>
      <div className="header">
        {backBtn && <button className="back-button" onClick={() => navigate("/")}></button>}

        {settingsBtn && (
          <a
            href="/settings-nav"
            className="settings-button"
            onClick={() => navigate("/settings-nav")}
          ></a>
        )}
      </div>
    </>
  );
}

export default Header;
