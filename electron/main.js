const { app, BrowserWindow, screen } = require("electron");
const express = require("express");

let overlayWindow;

function createWindow() {
  const { width: screenWidth, height: screenHeight } =
    screen.getPrimaryDisplay().workAreaSize;

  const winWidth = 500;
  const winHeight = 600;

  overlayWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth,
    y: screenHeight - winHeight,
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
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.hide();
}

app.whenReady().then(createWindow);

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
