const settings_btn = document.getElementById("settings-icon");
const useBasePrompt_checkbox = document.getElementById("useBasePrompt");
let new_animations = [];

let animations = [];

async function verifyHttpConnection(url, statusDiv) {
  statusDiv.textContent = "Verifying...";
  statusDiv.style.color = "";

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Server not reachable");

    const data = await response.json();
    // Adjust success check depending on API; here we just assume HTTP success
    statusDiv.textContent = "Connection successful!";
    statusDiv.style.color = "green";
  } catch (error) {
    statusDiv.textContent = "Connection error: " + error.message;
    statusDiv.style.color = "red";
  }
}

async function load_all_animations(savedUrls = []) {
  try {
    const res = await fetch("/api/load_animations");
    const allAnimations = await res.json();

    // Clear the current global array
    animations = allAnimations.map((anim) => ({
      id: anim.name.toLowerCase().replace(".fbx", ""),
      name: anim.name,
      url: anim.url,
      desc: `Animation: ${anim.name}`,
    }));

    // Render the checkboxes
    add_Animation(allAnimations);

    console.log(savedUrls);

    for (const anim of allAnimations) {
      const currentUrl = anim["url"];

      const fileName = currentUrl.split("/").pop();

      const isMatched = savedUrls.some((savedUrl) =>
        savedUrl.endsWith(fileName)
      );

      if (isMatched) {
        const fileName = currentUrl.split("/").pop();
        const safeId = fileName.replace(/[ .]/g, "_");
        let chekbox = document.getElementById(safeId);
        if (chekbox) {
          chekbox.checked = true;
        } else {
          console.error("Could not find element with ID:", safeId);
        }
      }
    }
  } catch (err) {
    console.error("Failed to load animations from backend:", err);
  }
}

function updateUI(settings) {
  if (!settings) return;

  load_all_animations(settings.animationUrls || []);

  add_Animation(animations);

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
    // Use a slight timeout or ensure this runs AFTER add_Animation
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
  if (settings.animation) {
    if (settings.animation.minAnimationInterval !== undefined)
      document.getElementById("minAnimationInterval").value =
        settings.animation.minAnimationInterval;
    if (settings.animation.maxAnimationInterval !== undefined)
      document.getElementById("maxAnimationInterval").value =
        settings.animation.maxAnimationInterval;
  }

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

  console.log("UI updated with loaded settings.");
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

document.getElementById("verifyBtnElectron").addEventListener("click", () => {
  const url = document.getElementById("electronUrl").value + "/status";
  const statusDiv = document.getElementById("status-electron");
  verifyHttpConnection(url, statusDiv);
});

document.getElementById("verifyBtnOllama").addEventListener("click", () => {
  const url = document.getElementById("ollamaUrl").value + "/api/version";
  const statusDiv = document.getElementById("status-ollama");
  verifyHttpConnection(url, statusDiv);

  populateOllamaModels();
});

document.getElementById("verifyBtnPiper").addEventListener("click", () => {
  const statusDiv = document.getElementById("status-piper");
  const piperPathInput = document.getElementById("piperPath");
  const voiceModelInput = document.getElementById("voiceModel");

  const piperPath = encodeURIComponent(piperPathInput.value);
  const voiceModel = encodeURIComponent(voiceModelInput.value);

  const url = `/status_piper?piper_path=${piperPath}&voice_model=${voiceModel}`;

  verifyHttpConnection(url, statusDiv);
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

settings_btn.addEventListener("click", () => {
  const settingsPanel = document.getElementById("settings");
  settingsPanel.classList.toggle("hidden");
});

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

populateOllamaModels();

const form = document.getElementById("settingsForm");

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const settingsPanel = document.getElementById("settings");
  settingsPanel.classList.add("hidden");

  const formData = new FormData(form);
  new_animations.flat().forEach((file) => {
    formData.append("animations", file);
  });

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

const fileBtn = document.getElementById("file-btn");
const fileInput = document.getElementById("file-input");

fileBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const selectedFiles = Array.from(fileInput.files);

  const fbxFiles = selectedFiles.filter((file) =>
    file.name.toLowerCase().endsWith(".fbx")
  );

  if (fbxFiles.length > 0) {
    // Convert File objects to our animation entry format
    const newEntries = fbxFiles.map((file) => ({
      id: file.name.toLowerCase().replace(".fbx", ""),
      name: file.name,
      url: file.name, // Use name as fallback URL until uploaded
      desc: `New upload: ${file.name}`,
    }));

    // Add to our global tracking array
    animations.push(...newEntries);
    new_animations.push(fbxFiles);

    // Refresh the list and the dropdown
    add_Animation(fbxFiles);
  } else if (selectedFiles.length > 0) {
    alert("Please select .fbx files only.");
    fileInput.value = "";
  }
});

const dropArea = document.getElementById("drop-area");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    false
  );
});

["dragenter", "dragover"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => {
      dropArea.classList.add("highlight");
    },
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  dropArea.addEventListener(
    eventName,
    () => {
      dropArea.classList.remove("highlight");
    },
    false
  );
});

dropArea.addEventListener("drop", (e) => {
  const dt = e.dataTransfer;
  const droppedFiles = Array.from(dt.files);

  const fbxFiles = droppedFiles.filter((file) =>
    file.name.toLowerCase().endsWith(".fbx")
  );

  if (fbxFiles.length > 0) {
    const newEntries = fbxFiles.map((file) => ({
      id: file.name.toLowerCase().replace(".fbx", ""),
      name: file.name,
      url: file.name,
      desc: `Dropped file: ${file.name}`,
    }));

    animations.push(...newEntries);
    add_Animation(fbxFiles);
  } else {
    alert("Please drop .fbx files only.");
  }
});

const list = document.getElementById("animations_list");

list.innerHTML = "";

function add_Animation(files) {
  if (!files || files.length === 0) return;

  for (const file of files) {
    const safeId = file.name.replace(/[^a-z0-9]/gi, "_");
    if (document.getElementById(safeId)) continue;

    const container = document.createElement("div");
    container.className = "animation_container";

    const label = document.createElement("label");
    label.setAttribute("for", safeId);
    label.textContent = file.name;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = safeId;
    checkbox.name = "animationUrls";
    checkbox.value = file.url || file.name;
    checkbox.checked = false;

    container.addEventListener("click", function (e) {
      if (e.target === checkbox) return;
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });

    container.appendChild(label);
    container.appendChild(checkbox);
    list.appendChild(container);
  }
  syncPoseDropdown();
}

const animationSelect = document.getElementById("defaultModelSelect");
const new_defalut_model = document.getElementById("new_defalut_model");

let default_models = [];

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

    console.log("Internal load with selection:", default_models);

    // 5. Update the UI
    renderModels();
    syncPoseDropdown(); // Also update the pose dropdown if it depends on this
  } catch (error) {
    console.error("Error loading models or settings:", error);
  }
}

await load_default_models();
console.log(default_models);

function renderModels() {
  while (animationSelect.options.length > 2) {
    animationSelect.remove(1);
  }

  for (const model of default_models) {
    const newOption = new Option(model.name, model.name);
    const lastIndex = animationSelect.options.length - 1;

    animationSelect.add(newOption, lastIndex);

    // This sets the dropdown to the correct value
    if (model.status === "selected") {
      animationSelect.value = model.name;
    }
  }
}

renderModels();

const poseSelect = document.getElementById("defaultPoseSelect");

function syncPoseDropdown() {
  const poseSelect = document.getElementById("defaultPoseSelect");
  if (!poseSelect) return;

  // 1. Keep the placeholder, clear everything else
  poseSelect.options.length = 1;

  // 2. Loop through your FBX animations array
  animations.forEach((anim) => {
    // We use anim.url as the value because that's what the server needs
    const opt = new Option(anim.name, anim.url || anim.name);
    poseSelect.add(opt);
  });

  // 3. Optional: Auto-select the first animation if one exists and none is selected
  if (poseSelect.options.length > 1 && !poseSelect.value) {
    poseSelect.selectedIndex = 1;
  }
}

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

    // Reset only the VRM model status
    default_models.forEach((m) => (m.status = "idle"));

    // Add the new VRM to the model list
    default_models.push({
      name: fileName,
      status: "selected",
      poseStatus: null, // Poses are FBX, so we leave this null here
    });

    const newOption = new Option(fileName, fileName);
    const lastIndex = animationSelect.options.length - 1;
    animationSelect.add(newOption, lastIndex);
    animationSelect.value = fileName;

    // We DON'T call syncPoseDropdown here because adding a VRM
    // shouldn't change the animation/pose list.
  }
});
