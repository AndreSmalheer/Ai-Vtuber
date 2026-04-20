import { useState, useEffect } from "react";
import "./GeneralSettings.css";

function GeneralSettings() {
  const [config, setConfig] = useState({
    ollama_url: "",
    ollama_model: "",
    base_prompt: "",
    response_speed: 50,
  });
  const [models, setModels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
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
  }, []);

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
      alert("Settings saved!");
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

          <div className="general-settings__field">
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

        <button type="submit" className="save-btn">
          Save
        </button>
      </form>
    </div>
  );
}

export default GeneralSettings;
