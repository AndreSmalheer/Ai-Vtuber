import { useState, useEffect, useCallback } from "react";
import "./GeneralSettings.css";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = base64String.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64 + padding);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

const FALLBACK_VAPID_PUBLIC_KEY =
  "BG0sZ7qsau7n56E1kdGy3Gx5Rznw5OlOZDkSnJl2pkGCvs0lKdUbAFuBTfEktjHRGjJ9WhGhetmakYesoy2AW20";
const isIos =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone =
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

function getNotificationDiagnostics() {
  return {
    secureContext: window.isSecureContext,
    notificationApi: "Notification" in window,
    serviceWorkerApi: "serviceWorker" in navigator,
    pushManagerApi: "PushManager" in window,
    standalone: isStandalone,
    ios: isIos,
    protocol: window.location.protocol,
    host: window.location.host,
  };
}

function getUnsupportedNotificationReason(diagnostics) {
  if (!diagnostics.secureContext) {
    return "This install is not running from a secure origin. iPhone push needs HTTPS.";
  }

  if (diagnostics.ios && !diagnostics.standalone) {
    return "On iOS, open Mia from the Home Screen icon before subscribing.";
  }

  if (!diagnostics.notificationApi) {
    return "This browser does not support notifications.";
  }

  if (!diagnostics.serviceWorkerApi) {
    return "This browser does not support service workers.";
  }

  if (!diagnostics.pushManagerApi) {
    return "This browser does not support Web Push here.";
  }

  return "";
}

function GeneralSettings() {
  const [config, setConfig] = useState({
    ollama_url: "",
    ollama_model: "",
    base_prompt: "",
    response_speed: 50,
    stealth_mode: false,
    orbit_controls_enabled: true,
    enable_effects: true,
    user_name: "Andre",
    ai_name: "Mia",
    auto_silence_detection: true,
    silence_delay_ms: 2000,
    enable_leave_notifications: true,
    leave_notification_min_min: 10,
    leave_notification_max_min: 60,
    leave_notification_prompt: "the user left, generate a message for you to send to them",
    welcome_message_prompt: "Give a very short (1 sentence) welcome back greeting to the user who just returned.",
  });
  const [saveMessage, setSaveMessage] = useState("");
  const [models, setModels] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [vrmModels, setVrmModels] = useState([]);
  const [isVrmOpen, setIsVrmOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [supportNotification, setSupportNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(
    "Checking notification support...",
  );
  const [vapidPublicKey, setVapidPublicKey] = useState(
    FALLBACK_VAPID_PUBLIC_KEY,
  );
  const [diagnostics, setDiagnostics] = useState(() =>
    getNotificationDiagnostics(),
  );

  const refreshNotificationStatus = useCallback(async () => {
    const nextDiagnostics = getNotificationDiagnostics();
    const unsupportedReason = getUnsupportedNotificationReason(nextDiagnostics);

    setDiagnostics(nextDiagnostics);

    if (unsupportedReason) {
      setSupportNotification(false);
      setIsSubscribed(false);
      setNotificationStatus(unsupportedReason);
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setSupportNotification(true);
      setIsSubscribed(Boolean(subscription));

      if (subscription) {
        setNotificationStatus("Subscribed and ready for notifications.");
      } else if (Notification.permission === "denied") {
        setNotificationStatus(
          "Notification permission is blocked in browser settings.",
        );
      } else if (Notification.permission === "granted") {
        setNotificationStatus(
          "Permission granted. Subscribe to save this device.",
        );
      } else {
        setNotificationStatus("Ready to request notification permission.");
      }
    } catch (error) {
      console.error("Error checking notification status:", error);
      setSupportNotification(false);
      setNotificationStatus("Could not initialize the service worker.");
    }
  }, []);

  useEffect(() => {
    refreshNotificationStatus();
  }, [refreshNotificationStatus]);

  useEffect(() => {
    const fetchVapidPublicKey = async () => {
      try {
        const response = await fetch("/api/notifaction/public-key");

        if (!response.ok) {
          return;
        }

        const data = await response.json();

        if (typeof data.publicKey === "string" && data.publicKey.length > 0) {
          setVapidPublicKey(data.publicKey);
        }
      } catch {}
    };

    fetchVapidPublicKey();
  }, []);

  const handleSubscribeNotifications = useCallback(async () => {
    if (!supportNotification) {
      setNotificationStatus("Notifications are not available here.");
      return;
    }

    setIsSubscribing(true);
    setNotificationStatus("Requesting permission...");

    try {
      let currentPermission = Notification.permission;

      if (currentPermission === "default") {
        currentPermission = await Notification.requestPermission();
      }

      if (currentPermission !== "granted") {
        setNotificationStatus("Notification permission was not granted.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setNotificationStatus("Subscribing this device...");
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      const response = await fetch("/api/subscribe-notifaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Backend subscription failed");
      }

      setIsSubscribed(true);
      setNotificationStatus("Subscribed and ready for notifications.");
    } catch (error) {
      console.error("Error during notification setup:", error);
      setNotificationStatus(
        "Subscription failed. Check the console/server logs.",
      );
    } finally {
      setIsSubscribing(false);
    }
  }, [supportNotification, vapidPublicKey]);

  const notifyConfigUpdated = (nextConfig) => {
    window.dispatchEvent(
      new CustomEvent("app-config-updated", { detail: nextConfig }),
    );
  };

  const saveConfig = async (nextConfig) => {
    const sanitizedConfig = {
      ...nextConfig,
      response_speed:
        nextConfig.response_speed === "" ? 50 : nextConfig.response_speed,
      welcome_threshold:
        nextConfig.welcome_threshold === ""
          ? 120
          : nextConfig.welcome_threshold,
      leave_notification_min_min:
        nextConfig.leave_notification_min_min === ""
          ? 10
          : nextConfig.leave_notification_min_min,
      leave_notification_max_min:
        nextConfig.leave_notification_max_min === ""
          ? 60
          : nextConfig.leave_notification_max_min,
      leave_notification_prompt:
        nextConfig.leave_notification_prompt === ""
          ? "the user left, generate a message for you to send to them"
          : nextConfig.leave_notification_prompt,
      welcome_message_prompt:
        nextConfig.welcome_message_prompt === ""
          ? "Give a very short (1 sentence) welcome back greeting to the user who just returned."
          : nextConfig.welcome_message_prompt,
    };

    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sanitizedConfig),
    });
    notifyConfigUpdated(sanitizedConfig);
  };

  async function fetchVrmModels() {
    try {
      const response = await fetch("/api/vrm-models");
      const data = await response.json();
      if (Array.isArray(data)) {
        setVrmModels(data);
      }
    } catch (err) {
      console.error("Error fetching VRM models:", err);
    }
  }

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch((err) => console.error("Error fetching config:", err));

    Promise.resolve().then(fetchVrmModels);
  }, []);

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
        const nextConfig = { ...config, avatar_model: data.filename };
        setConfig(nextConfig);
        await saveConfig(nextConfig);
        setSaveMessage("Avatar model applied!");
        setTimeout(() => setSaveMessage(""), 3000);
      }
    } catch (err) {
      console.error("Error uploading VRM model:", err);
    }
  };

  const handleAvatarModelSelect = async (modelName) => {
    const nextConfig = { ...config, avatar_model: modelName };
    setConfig(nextConfig);
    setIsVrmOpen(false);

    try {
      await saveConfig(nextConfig);
      setSaveMessage("Avatar model applied!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Error saving avatar model:", err);
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
      await saveConfig(config);
      setSaveMessage("Settings saved!");
      setTimeout(() => setSaveMessage(""), 3000);
    } catch (err) {
      console.error("Error saving config:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    let finalValue = value;
    if (type === "number") {
      finalValue = value === "" ? "" : parseInt(value, 10);
    }

    setConfig((prev) => ({ ...prev, [name]: finalValue }));
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

          <div
            className="general-settings__field"
            id="response-speed-container"
          >
            <label className="general-settings__label">
              Response Speed (ms)
            </label>
            <input
              type="number"
              className="general-settings__input"
              name="response_speed"
              min="0"
              max="1000"
              value={
                config.response_speed === ""
                  ? ""
                  : (config.response_speed ?? 50)
              }
              onChange={handleChange}
              style={{ marginLeft: "10px", width: "100px" }}
            />
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
                      onClick={() => handleAvatarModelSelect(m)}
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
              className={`theme-toggle ${config.is_dark ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  is_dark: !config.is_dark,
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div className="general-settings__field" id="stealth-mode-container">
            <label className="general-settings__label">Stealth Mode</label>
            <div
              className={`theme-toggle ${config.stealth_mode ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  stealth_mode: !config.stealth_mode,
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div
            className="general-settings__field"
            id="effects-controls-container"
          >
            <label className="general-settings__label">Effects</label>
            <div
              className={`theme-toggle ${config.enable_effects !== false ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  enable_effects: !(config.enable_effects !== false),
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>
        </div>

        <div className="general-settings__section">
          <h1 className="general-settings__title">Interaction</h1>

          <div
            className="general-settings__field"
            id="orbit-controls-container"
          >
            <label className="general-settings__label">Orbit Controls</label>
            <div
              className={`theme-toggle ${config.orbit_controls_enabled !== false ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  orbit_controls_enabled: !(
                    config.orbit_controls_enabled !== false
                  ),
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>
        </div>

        <div className="general-settings__section">
          <h1 className="general-settings__title">Microphone</h1>

          <div
            className="general-settings__field"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
            id="auto-silence-toggle-container"
          >
            <label className="general-settings__label">
              Auto Silence Detection
            </label>

            <div
              className={`theme-toggle ${
                config.auto_silence_detection ? "active" : ""
              }`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  auto_silence_detection: !config.auto_silence_detection,
                };

                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div
            className="general-settings__field"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">
              Auto-send when mic stops
            </label>

            <div
              className={`theme-toggle ${
                config.auto_send_on_mic_stop ? "active" : ""
              }`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  auto_send_on_mic_stop: !config.auto_send_on_mic_stop,
                };

                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div
            className="general-settings__field"
            id="silence-delay-container"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">
              Silence Delay (ms)
            </label>

            <input
              type="number"
              min="0"
              value={config.silence_delay_ms ?? 2000}
              onChange={(e) => {
                const nextConfig = {
                  ...config,
                  silence_delay_ms: Number(e.target.value),
                };

                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              className="general-settings__input"
              style={{
                marginLeft: "10px",
                maxWidth: "75px",
              }}
            />
          </div>
        </div>

        <div className="general-settings__section">
          <h1 className="general-settings__title">Welcome Message</h1>
          <div
            className="general-settings__field"
            id="welcome-threshold-toggle-container"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">Enable Welcome</label>

            <div
              className={`theme-toggle ${config.enable_welcome_message ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  enable_welcome_message: !config.enable_welcome_message,
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div
            className="general-settings__field"
            id="welcome-threshold-container"
          >
            <label className="general-settings__label">
              Welcome Threshold (s)
            </label>
            <input
              type="number"
              className="general-settings__input"
              name="welcome_threshold"
              min="10"
              max="3600"
              value={
                config.welcome_threshold === ""
                  ? ""
                  : (config.welcome_threshold ?? 120)
              }
              onChange={handleChange}
              style={{ marginLeft: "10px", width: "100px" }}
            />
          </div>

          <div className="general-settings__field">
            <label className="general-settings__label">Welcome Prompt</label>
            <textarea
              className="general-settings__input"
              name="welcome_message_prompt"
              value={config.welcome_message_prompt}
              onChange={handleChange}
              rows={3}
            />
          </div>
        </div>

        <div
          className="general-settings__section"
          style={{ marginTop: "20px" }}
        >
          <h1 className="general-settings__title">Notifications</h1>
          <div className="general-settings__field notification-settings-field">
            <div>
              <label className="general-settings__label">Subscribed</label>
            </div>
            <button
              type="button"
              className={`theme-toggle notification-settings__toggle ${isSubscribed ? "active" : ""}`}
              onClick={handleSubscribeNotifications}
              disabled={
                isSubscribing ||
                isSubscribed ||
                !supportNotification ||
                ("Notification" in window &&
                  Notification.permission === "denied")
              }
              aria-label="Subscribe to push notifications"
              aria-pressed={isSubscribed}
            >
              <div className="theme-toggle__circle"></div>
            </button>
          </div>

          <div
            className="general-settings__field"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">
              Enable Leave Notification
            </label>
            <div
              className={`theme-toggle ${config.enable_leave_notifications ? "active" : ""}`}
              onClick={() => {
                const nextConfig = {
                  ...config,
                  enable_leave_notifications:
                    !config.enable_leave_notifications,
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
              style={{ marginLeft: "10px" }}
            >
              <div className="theme-toggle__circle" />
            </div>
          </div>

          <div
            className="general-settings__field"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">Min Delay (min)</label>
            <input
              type="number"
              className="general-settings__input"
              name="leave_notification_min_min"
              min="1"
              value={config.leave_notification_min_min ?? 10}
              onChange={handleChange}
              style={{ marginLeft: "10px", width: "80px", maxWidth: "75px" }}
            />
          </div>

          <div
            className="general-settings__field"
            style={{
              display: "flex",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            <label className="general-settings__label">Max Delay (min)</label>
            <input
              type="number"
              className="general-settings__input"
              name="leave_notification_max_min"
              min="1"
              value={config.leave_notification_max_min ?? 60}
              onChange={handleChange}
              style={{ marginLeft: "10px", width: "80px", maxWidth: "75px" }}
            />
          </div>

          <div className="general-settings__field">
            <label className="general-settings__label">Leave Prompt</label>
            <textarea
              className="general-settings__input"
              name="leave_notification_prompt"
              value={config.leave_notification_prompt}
              onChange={handleChange}
              rows={3}
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
              onClick={() => {
                const nextConfig = {
                  ...config,
                  tts_enabled: !config.tts_enabled,
                };
                setConfig(nextConfig);
                saveConfig(nextConfig);
              }}
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
