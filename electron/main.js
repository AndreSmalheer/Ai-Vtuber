const { app, BrowserWindow, screen, globalShortcut } = require("electron");
const express = require("express");

let overlayWindow;

function createWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  overlayWindow = new BrowserWindow({
    width: screenWidth,
    height: screenHeight,
    x: 0,
    y: 0,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    hasShadow: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.loadURL("http://127.0.0.1:5000/overlay");
  overlayWindow.hide();
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
}

let overlayVisible = false;

app.whenReady().then(() => {
  createWindow();

  globalShortcut.register("Control+Shift+O", () => {
    overlayVisible = !overlayVisible;

    if (overlayVisible) {
      overlayWindow.setIgnoreMouseEvents(false);
    } else {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    }
    overlayWindow.webContents.send("toggle-visibility");
  });
});

// Electron API
const api = express();
const PORT = 8123;

api.get("/show", (req, res) => {
  overlayWindow.show();
  res.send("shown");
});

api.get("/hide", (req, res) => {
  overlayWindow.hide();
  res.send("hidden");
});

api.listen(PORT, () => {
  console.log("Electron overlay API running on port", PORT);
});
