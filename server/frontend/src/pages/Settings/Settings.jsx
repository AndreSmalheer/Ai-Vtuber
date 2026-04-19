import "./Settings.css";
import { Link } from "react-router-dom";

function Settings() {
  return (
    <div className="settings">
      <Link to="/settings" className="settings-item">
        <div className="settings-item__content">
          <h1 className="settings-item__title">General Settings</h1>
          <div className="settings-item__arrow"></div>
        </div>
        <div className="settings-item__divider"></div>
      </Link>

      <Link to="/chat-history" className="settings-item">
        <div className="settings-item__content">
          <h1 className="settings-item__title">Chat History</h1>
          <div className="settings-item__arrow"></div>
        </div>
        <div className="settings-item__divider"></div>
      </Link>
    </div>
  );
}

export default Settings;
