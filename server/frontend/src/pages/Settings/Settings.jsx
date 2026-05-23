import "./Settings.css";
import { Link } from "react-router-dom";

function Settings() {
  return (
    <div className="settings">
      <section className="settings-hero">
        <div className="settings-hero__glow"></div>
        <img
          className="settings-hero__image"
          src="/onboarding/welcome-onboarding-img.png"
          alt=""
        />
        <div className="settings-hero__content">
          <h1 className="settings-hero__title">Personalize Mia</h1>
        </div>
      </section>

      <nav className="settings-list" aria-label="Settings sections">
        <Link to="/settings" className="settings-item">
          <div className="settings-item__icon settings-item__icon--settings"></div>
          <div className="settings-item__content">
            <h1 className="settings-item__title">Settings</h1>
            <p className="settings-item__description">
              Voice, appearance, notifications, and model setup.
            </p>
          </div>
          <div className="settings-item__arrow"></div>
        </Link>

        <Link to="/chat-history" className="settings-item">
          <div className="settings-item__icon settings-item__icon--history"></div>
          <div className="settings-item__content">
            <h1 className="settings-item__title">Chat History</h1>
            <p className="settings-item__description">
              Review or clear saved conversations.
            </p>
          </div>
          <div className="settings-item__arrow"></div>
        </Link>
      </nav>
    </div>
  );
}

export default Settings;
