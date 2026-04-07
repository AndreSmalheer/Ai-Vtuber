import { input, button } from "./dom.js";
import { handleMessage } from "./chatController.js";
import { fetchAiResponse } from "./ai.js";

button.addEventListener("click", () => {
  handleMessage(input.value.trim(), fetchAiResponse);
});

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    handleMessage(input.value.trim(), fetchAiResponse);
  }
});
