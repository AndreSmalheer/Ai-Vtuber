import { show_error } from "./errors.js";

async function loadConfig() {
  try {
    const response = await fetch("/config");
    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.status}`);
    }
    const config = await response.json(); // will throw if JSON is invalid
    return config;
  } catch (err) {
    console.error("Error loading config:", err);
    show_error("JSON file not configured properly");
    return null;
  }
}

export const configPromise = loadConfig();
