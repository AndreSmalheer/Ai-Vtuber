import {
  chatContainer,
  input,
  setInputState,
  createMessage,
} from "./dom.js";

export function startUserPhase(message) {
  chatContainer.classList.remove("hidden", "hidden-animation");
  chatContainer.innerHTML = "";

  setInputState(false);

  const userMessage = createMessage("User", message);
  chatContainer.appendChild(userMessage);

  input.value = "";
}

export function startTransition(callback) {
  setTimeout(() => {
    chatContainer.classList.add("hidden-animation");
  }, 2000);

  setTimeout(() => {
    callback();
  }, 3250);
}

export async function startAiPhase(aiStream) {
  chatContainer.classList.remove("hidden", "hidden-animation");
  chatContainer.innerHTML = "";

  const aiMessage = createMessage("AI", "");
  const aiText = aiMessage.querySelector(".message-text");

  chatContainer.appendChild(aiMessage);

  for await (const chunk of aiStream) {
    aiText.textContent += chunk;
    await new Promise((r) => setTimeout(r, 30));
  }

  setTimeout(() => {
    chatContainer.classList.add("hidden-animation");
    setInputState(true);
  }, 2000);
}

export function handleMessage(message, fetchAiResponse) {
  if (message === "") return;

  startUserPhase(message);

  const aiStream = fetchAiResponse(message);

  startTransition(() => {
    startAiPhase(aiStream);
  });
}
