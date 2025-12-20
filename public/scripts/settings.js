const settings_btn = document.getElementById("settings-icon");
const useBasePrompt_checkbox = document.getElementById("useBasePrompt");

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

  const formData = new FormData(form);
  formData.delete("USE_BASE_PROMPT");

  const useBasePrompt = form.querySelector("#useBasePrompt").checked;
  if (!useBasePrompt) {
    formData.set("BASE_PROMPT", "");
  }
  const data = Object.fromEntries(formData.entries());

  console.log(data);
});
