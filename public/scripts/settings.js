const settings_btn = document.getElementById("settings-icon");
const useBasePrompt_checkbox = document.getElementById("useBasePrompt");
let new_animations = [];

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
    new_animations.push(fbxFiles);
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
    add_Animation(fbxFiles);
  } else {
    alert("Please drop .fbx files only.");
  }
});

let animations = [
  {
    id: "idle",
    name: "Idle.fbx",
    url: "public/assets/animations/Idle.fbx",
    desc: "Idle animation for the avatar",
  },
  {
    id: "breathing",
    name: "Breathing.fbx",
    url: "public/assets/animations/Breathing Idle.fbx",
    desc: "Breathing animation",
  },
];

const list = document.getElementById("animations_list");

list.innerHTML = "";

add_Animation(animations);

function add_Animation(files) {
  for (const file of files) {
    const safeId = file.name.replace(/[^a-z0-9]/gi, "_");

    const container = document.createElement("div");
    container.className = "animation_container";
    container.title = file.desc || `File: ${file.name}`;

    const label = document.createElement("label");
    label.setAttribute("for", safeId);
    label.textContent = file.name;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = safeId;
    checkbox.name = "animationUrls";

    checkbox.value = file.url || file.name;
    checkbox.checked = true;

    container.addEventListener("click", function (e) {
      if (event.target === checkbox) {
        return;
      }
      checkbox.checked = !checkbox.checked;
      checkbox.dispatchEvent(new Event("change"));
    });

    container.appendChild(label);
    container.appendChild(checkbox);
    list.appendChild(container);
  }
}
