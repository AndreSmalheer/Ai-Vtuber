export async function* fetchAiResponse(message) {
  const responseText =
    "This is a streamed AI response generated over time... its nice to meet you my frien" + "d! I hope we can have a great conversation together. What would you like to talk about today?";

  for (let i = 0; i < responseText.length; i++) {
    await new Promise((r) => setTimeout(r, 30));
    yield responseText[i];
  }
}
