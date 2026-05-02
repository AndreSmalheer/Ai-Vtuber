import { useState, useEffect } from "react";
import "./GeneralSettings.css";

function GeneralSettings() {
  const [config, setConfig] = useState({
    ollama_url: "",
    ollama_model: "",
    base_prompt: "",
    response_speed: 50,
    stealth_mode: false,
    user_name: "You",
    ai_name: "AI",
  });
  const [saveMessage, setSaveMessage] = useState(""); // Added this line
  const [models, setModels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [vrmModels, setVrmModels] = useState([]);
  const [isVrmOpen, setIsVrmOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.body.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Error fetching config:", err));
    
    fetchVrmModels();
  }, []);

  const fetchVrmModels = async () => {
    try {
      const response = await fetch("/api/vrm-models");
      const data = await response.json();
      if (Array.isArray(data)) {
        setVrmModels(data);
      }
    } catch (err) {
      console.error("Error fetching VRM models:", err);
    }
  };

  const handleVrmUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/vrm-models/upload", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") {
        await fetchVrmModels();
        setConfig(prev => ({ ...prev, avatar_model: data.filename }));
      }
    } catch (err) {
      console.error("Error uploading VRM model:", err);
    }
  };

  const fetchModels = async () => {
    if (!config.ollama_url) return;

    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/models?url=${encodeURIComponent(config.ollama_url)}`,
      );
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.models) {
        setModels(data.models);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      setError(
        "Failed to fetch models. Make sure Ollama is running and the URL is correct.",
      );
    }

    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaveMessage("Settings saved!");
      setTimeout(() => setSaveMessage(""), 3000); // Clear message after 3 seconds
    } catch (err) {
      console.error("Error saving config:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="general-settings">
      <form className="general-settings__form" onSubmit={handleSave}>
        {saveMessage && <div className="save-message">{saveMessage}</div>}
        <div className="general-settings__section">
          <h1 className="general-settings__title">Ollama</h1>

          <div className="general-settings__field">
            <label className="general-settings__label">Ollama URL</label>
            <div
              className="general-settings__input-group"
              id="ollama-url-group"
            >
              <input
                type="text"
                className="general-settings__input"
                name="ollama_url"
                value={config.ollama_url}
                onChange={handleChange}
              />
              <button
                type="button"
                className={`refresh-btn ${isRefreshing ? "spinning" : ""}`}
                onClick={fetchModels}
              ></button>
            </div>
          </div>

          <div className="general-settings__field">
            <label className="general-settings__label">Ollama Model</label>
            <div className="custom-select">
              <div
                className="open-icon"
                onClick={() => setIsOpen(!isOpen)}
              ></div>
              <div
                className="custom-select__selected"
                onClick={() => setIsOpen(!isOpen)}
              >
                {config.ollama_model || "Select a model"}
              </div>

              {isOpen && (
                <ul className="custom-select__dropdown">
                  <li
                    className="custom-select__option"
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, ollama_model: "" }));
                      setIsOpen(false);
                    }}
                  >
                    Select a model
                  </li>

                  {models.map((m) => (
                    <li
                      key={m.name}
                      className="custom-select__option"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          ollama_model: m.name,
                        }));
                        setIsOpen(false);
                      }}
                    >
                      {m.name}
                    </li>
                  ))}

                  {config.ollama_model &&
                    !models.find((m) => m.name === config.ollama_model) && (
                      <li
                        className="custom-select__option"
                        onClick={() => setIsOpen(false)}
                      >
                        {config.ollama_model}
                      </li>
                    )}
                </ul>
              )}
            </div>
            {error && <div className="error-message">{error}</div>}
          </div>

          <div className="general-settings__field">
            <label className="general-settings__label">Base Prompt</label>
            <textarea
              className="general-settings__input"
              name="base_prompt"
              value={config.base_prompt}
              onChange={handleChange}
              rows={4}
            />
          </div>
        </div>

        <div
          className="general-settings__section"
          style={{ marginTop: "20px" }}
        >
          <h1 className="general-settings__title">Identity</h1>
          <div className="general-settings__field">
            <label className="general-settings__label">User Name</label>
            <input
              type="text"
              className="general-settings__input"
              name="user_name"
              value={config.user_name}
              onChange={handleChange}
              placeholder="You"
            />
          </div>
          <div className="general-settings__field">
            <label className="general-settings__label">AI Name</label>
            <input
              type="text"
              className="general-settings__input"
              name="ai_name"
              value={config.ai_name}
              onChange={handleChange}
              placeholder="AI"
            />
          </div>
          <div className="general-settings__field">
            <label className="general-settings__label">Avatar Model</label>
            <div className="custom-select">
              <div
                className="open-icon"
                onClick={() => setIsVrmOpen(!isVrmOpen)}
              ></div>
              <div
                className="custom-select__selected"
                onClick={() => setIsVrmOpen(!isVrmOpen)}
              >
                {config.avatar_model || "Select a model"}
              </div>

              {isVrmOpen && (
                <ul className="custom-select__dropdown">
                  {vrmModels.map((m) => (
                    <li
                      key={m}
                      className="custom-select__option"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          avatar_model: m,
                        }));
                        setIsVrmOpen(false);
                      }}
                    >
                      {m}
                    </li>
                  ))}
                  <li className="custom-select__option add-model-option">
                    <label htmlFor="vrm-upload" className="add-model-label">
                      <span className="plus-icon">+</span> Add VRM Model
                    </label>
                    <input
                      type="file"
                      id="vrm-upload"
                      accept=".vrm"
                      onChange={handleVrmUpload}
                      style={{ display: "none" }}
                    />
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>

        <div
          className="general-settings__section"
          style={{ marginTop: "20px" }}
        >
          <h1 className="general-settings__title">Appearance</h1>
          <div className="general-settings__field" id="dark-mode-container">
            <label className="general-settings__label">Dark Mode</label>
            <div
              className={`theme-toggle ${isDark ? "active" : ""}`}
              onClick={() => setIsDark(!isDark)}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle"></div>
            </div>
          </div>

          <div className="general-settings__field" id="stealth-mode-container">
            <label className="general-settings__label">Stealth Mode</label>
            <div
              className={`theme-toggle ${config.stealth_mode ? "active" : ""}`}
              onClick={() => setConfig(prev => ({ ...prev, stealth_mode: !prev.stealth_mode }))}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle"></div>
            </div>
          </div>

          <div className="general-settings__field" id="response-speed-container">
            <label className="general-settings__label">
              Response Speed (ms)
            </label>
            <input
              type="number"
              className="general-settings__input"
              name="response_speed"
              min="0"
              max="1000"
              step="10"
              value={config.response_speed}
              onChange={handleChange}
              style={{ marginLeft: "10px", width: "100px" }}
            />
          </div>
        </div>

        <div
          className="general-settings__section"
          style={{ marginTop: "20px" }}
        >
          <h1 className="general-settings__title">Piper TTS</h1>
          <div className="general-settings__field" id="tts-mode-container">
            <label className="general-settings__label">Enable TTS</label>
            <div
              className={`theme-toggle ${config.tts_enabled ? "active" : ""}`}
              onClick={() => setConfig(prev => ({ ...prev, tts_enabled: !prev.tts_enabled }))}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle"></div>
            </div>
          </div>

          <div className="general-settings__field">
            <label className="general-settings__label">Piper URL</label>
            <input
              type="text"
              className="general-settings__input"
              name="piper_url"
              value={config.piper_url || "http://localhost:10200"}
              onChange={handleChange}
              placeholder="http://localhost:10200"
            />
          </div>
        </div>

        <button type="submit" className="save-btn">
          Save
        </button>
      </form>
    </div>
  );
}

export default GeneralSettings;
