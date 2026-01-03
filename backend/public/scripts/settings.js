const settings_btn = document.getElementById("settings-icon");
const useBasePrompt_checkbox = document.getElementById("useBasePrompt");
const form = document.getElementById("settingsForm");
const animationSelect = document.getElementById("defaultModelSelect");
let default_models = [];

settings_btn.addEventListener("click", () => {
  load_settings();
  const settingsPanel = document.getElementById("settings");
  settingsPanel.classList.toggle("hidden");
});

useBasePrompt_checkbox.addEventListener("change", (event) => {
  const basePrompt_element = document.getElementById("basePrompt");
  const basePromptLabel = document.querySelector('label[for="basePrompt"]');

  if (event.target.checked) {
    basePrompt_element.classList.remove("hidden");
    basePromptLabel.classList.remove("hidden");
  } else {
    basePrompt_element.classList.add("hidden");
    basePromptLabel.classList.add("hidden");
  }
});

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const settingsPanel = document.getElementById("settings");
  settingsPanel.classList.add("hidden");

  const formData = new FormData(form);

  const vrmInput = document.getElementById("new_defalut_model");
  if (vrmInput.files && vrmInput.files[0]) {
    formData.append("vrm_file", vrmInput.files[0]);
  }

  const useBasePrompt = form.querySelector("#useBasePrompt").checked;
  if (!useBasePrompt) {
    formData.set("BASE_PROMPT", "");
  }

  formData.delete("USE_BASE_PROMPT");

  fetch("http://127.0.0.1:5000/api/update_settings", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => console.log("Success:", result))
    .catch((error) => console.error("Error:", error));
});

const canvas_wrap = document.querySelectorAll(".canvas-wrap");

canvas_wrap.forEach((canvas) => {
  canvas.addEventListener("click", () => {
    const settings_container = document.getElementById("settings");

    settings_container.classList.add("hidden");
  });
});

const checkboxes = document.querySelectorAll('input[type="checkbox"]');

for (const checkbox of checkboxes) {
  const parent = checkbox.parentElement;

  parent.addEventListener("click", (event) => {
    if (event.target === checkbox) {
      return;
    }
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event("change"));
  });
}

function updateUI(settings) {
  if (!settings) return;

  const poseSelect = document.getElementById("defaultPoseSelect");
  if (settings.defaultPose) {
    poseSelect.value = settings.defaultPose;
  }

  const simpleFields = {
    electronUrl: settings.ELECTRON_URL,
    wslHome: settings.WSL_HOME,
    piperPath: settings.PIPER_PATH,
    voiceModel: settings.VOICE_MODEL,
    defaultModelUrl: settings.defaultModelUrl,
    defaultPose: settings.defaultPose,
    blinkDuration: settings.blinkDuration,
    textAnimationSpeedMs: settings.textAnimationSpeedMs,
    ttsMinBuffer: settings.ttsMinBuffer,
    lightColor: settings.light_color,
    lightIntensity: settings.light_intensety,
  };

  if (settings.animationUrls && Array.isArray(settings.animationUrls)) {
    const animCheckboxes = document.querySelectorAll(
      'input[name="animationUrls"]'
    );
    animCheckboxes.forEach((cb) => {
      cb.checked = settings.animationUrls.includes(cb.value);
    });
  }

  for (const [key, value] of Object.entries(simpleFields)) {
    let el =
      document.getElementById(key) || document.querySelector(`[name="${key}"]`);

    if (el && value !== undefined) {
      if (el.id === "defaultModelSelect") {
        continue;
      }

      if (el.id === "defaultPoseSelect") {
        continue;
      }

      if (el.tagName === "SELECT") {
        const optionExists = Array.from(el.options).some(
          (opt) => opt.value === value
        );
        if (optionExists) {
          el.value = value;
        } else {
          el.selectedIndex = 0;
        }
      } else {
        el.value = value;
      }
    }
  }

  // --- 2. Nested Objects (Animation & Ollama) ---
  if (settings.ollama) {
    if (settings.ollama.ollamaUrl !== undefined)
      document.getElementById("ollamaUrl").value = settings.ollama.ollamaUrl;
    if (settings.ollama.ollamaModel !== undefined)
      document.getElementById("ollamaModel").value =
        settings.ollama.ollamaModel;
    if (settings.ollama.ttsChunkThreshold !== undefined)
      document.getElementById("ttsChunkThreshold").value =
        settings.ollama.ttsChunkThreshold;
    if (settings.ollama.basePromt !== "") {
      document.getElementById("basePrompt").value = settings.ollama.basePromt;
      document.getElementById("useBasePrompt").checked = true;
      document.getElementById("basePrompt").classList.remove("hidden");
    } else {
      document.getElementById("basePrompt").innerHTML = "";
      document.getElementById("basePrompt").classList.add("hidden");
      document.getElementById("useBasePrompt").checked = false;
    }

    // Handle Checkbox for Debug
    const debugEl = document.getElementById("debug");
    if (debugEl) debugEl.checked = !!settings.ollama.debug;
  }

  // --- 3. Checkboxes (Booleans) ---
  const checkboxes = {
    eyeTrackingEnabled: settings.eyeTrackingEnabled,
    blink: settings.blink,
  };

  for (const [id, value] of Object.entries(checkboxes)) {
    const el = document.getElementById(id);
    if (el && value !== undefined) {
      el.checked = !!value;
    }
  }

  // --- 4. Special Case: Animation List (Checkboxes by Value) ---
  if (settings.animationUrls && Array.isArray(settings.animationUrls)) {
    const animCheckboxes = document.querySelectorAll(
      'input[name="animationUrls"]'
    );
    animCheckboxes.forEach((cb) => {
      cb.checked = settings.animationUrls.includes(cb.value);
    });
  }
}

function load_settings() {
  fetch("http://127.0.0.1:5000/api/load_settings", {})
    .then((response) => response.json())
    .then((data) => {
      updateUI(data);
    })
    .catch((error) => console.error("Error:", error));
}

load_settings();

async function populateOllamaModels() {
  const select = document.getElementById("ollamaModel");
  const url = document.getElementById("ollamaUrl").value + "/api/tags";

  try {
    const res = await fetch(url);
    const data = await res.json();

    const modelsArray = Array.isArray(data.models) ? data.models : [];

    select.innerHTML = "";

    modelsArray.forEach(function (modelObj) {
      const option = document.createElement("option");
      option.value = modelObj.model;
      option.textContent = modelObj.name;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
}

async function verifyHttpConnection(url, statusDiv) {
  statusDiv.textContent = "Verifying...";
  statusDiv.style.color = "";

  try {
    const response = await fetch(url);

    if (!response.ok)
      throw new Error("Server not reachable (HTTP " + response.status + ")");

    let data;
    try {
      data = await response.json();
      if (!data.status && !data.version) {
        throw new Error("Unexpected JSON format");
      }
    } catch {}

    statusDiv.textContent = "Connection successful!";
    statusDiv.style.color = "green";
  } catch (error) {
    statusDiv.textContent = "Connection error: " + error.message;
    statusDiv.style.color = "red";
  }

  setTimeout(() => {
    statusDiv.classList.add("animate-text-out");
  }, 2000);
}

populateOllamaModels();

function setupVerifyButtons() {
  document.getElementById("verifyBtnPiper").addEventListener("click", () => {
    const url = document.getElementById("verifyBtnPiper").value;
    console.log(url);
    verifyHttpConnection(url, document.getElementById("status-piper"));
  });

  document.getElementById("verifyBtnOllama").addEventListener("click", () => {
    const url = document.getElementById("ollamaUrl").value + "/api/version";
    verifyHttpConnection(url, document.getElementById("status-ollama"));
    populateOllamaModels();
  });
}

setupVerifyButtons();

async function load_default_models() {
  try {
    // 1. Get the VRM file list
    const vrmRes = await fetch("/api/load_vrm_models");
    const vrmData = await vrmRes.json();

    // 2. Get the current settings
    const settingsRes = await fetch("http://127.0.0.1:5000/api/load_settings");
    const settingsData = await settingsRes.json();

    // 3. Extract the saved filename
    const savedFileName = settingsData.defaultModelUrl
      ? settingsData.defaultModelUrl.split("/").pop()
      : "";

    default_models = vrmData.map((name) => {
      const isSelected = name === savedFileName;
      return {
        name: name,
        status: isSelected ? "selected" : "idle",
        poseStatus: isSelected ? "selected" : "idle",
      };
    });

    // console.log("Internal load with selection:", default_models);

    renderModels();
  } catch (error) {
    console.error("Error loading models or settings:", error);
  }
}

await load_default_models();

function renderModels() {
  while (animationSelect.options.length > 2) {
    animationSelect.remove(1);
  }

  for (const model of default_models) {
    const newOption = new Option(model.name, model.name);
    const lastIndex = animationSelect.options.length - 1;

    animationSelect.add(newOption, lastIndex);

    if (model.status === "selected") {
      animationSelect.value = model.name;
    }
  }
}

renderModels();

animationSelect.addEventListener("change", function () {
  if (this.value === "add") {
    new_defalut_model.click();
    this.value = "";
  } else {
    default_models.forEach(
      (m) => (m.status = m.name === this.value ? "selected" : "idle")
    );
  }
});

new_defalut_model.addEventListener("change", function () {
  if (this.files && this.files[0]) {
    const fileName = this.files[0].name;

    default_models.forEach((m) => (m.status = "idle"));

    default_models.push({
      name: fileName,
      status: "selected",
    });

    const newOption = new Option(fileName, fileName);
    const lastIndex = animationSelect.options.length - 1;
    animationSelect.add(newOption, lastIndex);
    animationSelect.value = fileName;
  }
});
