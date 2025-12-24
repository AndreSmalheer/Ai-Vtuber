import { streamOllamaResponse } from "../logic/llm.js";

const input = document.querySelector(".styled-input");
const textSpan = document.getElementById("text_span");
const chatSubmit = document.getElementById("chatSubmit");

function handleUserInput(input) {
  const userText = input.value;
  input.value = "";

  textSpan.innerHTML = userText;
  textSpan.className = "";
  textSpan.classList.remove("animate-text");
  void textSpan.offsetWidth;
  textSpan.classList.add("animate-text");

  function onUserAnimationEnd() {
    textSpan.removeEventListener("animationend", onUserAnimationEnd);

    setTimeout(async () => {
      textSpan.innerHTML = "";
      textSpan.classList.remove("animate-text-ai");
      void textSpan.offsetWidth;
      textSpan.classList.add("animate-text-ai");

      await streamOllamaResponse(textSpan, userText);
    }, 1000);
  }

  textSpan.addEventListener("animationend", onUserAnimationEnd);
}

if (input) {
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") handleUserInput(input);
  });
}

chatSubmit.addEventListener("click", () => {
  if (input.value) handleUserInput(input);
});
