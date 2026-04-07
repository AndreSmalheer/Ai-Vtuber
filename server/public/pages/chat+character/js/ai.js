export async function* fetchAiResponse(message) {
  const responseText =
    "This is a streamed AI response generated over time...";

  for (let i = 0; i < responseText.length; i++) {
    await new Promise((r) => setTimeout(r, 30));
    yield responseText[i];
  }
}
