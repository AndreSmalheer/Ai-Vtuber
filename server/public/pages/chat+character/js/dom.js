export const input = document.querySelector(".input-container input");
export const button = document.querySelector(".send-btn");
export const chatContainer = document.querySelector(".chat-container");

chatContainer.innerHTML = "";

export function setInputState(enabled) {
  input.disabled = !enabled;

  if (enabled) {
    setTimeout(() => input.focus(), 0);
  }
}

export function createMessage(name, text) {
  const message = document.createElement("div");
  message.classList.add("message", "new-message");

  const nameElement = document.createElement("h1");
  nameElement.classList.add("user-name");
  nameElement.textContent = name;

  const textElement = document.createElement("p");
  textElement.classList.add("message-text");
  textElement.textContent = text;

  message.appendChild(nameElement);
  message.appendChild(textElement);

  return message;
}
