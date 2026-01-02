const {
  app,
  BrowserWindow,
  screen,
  globalShortcut,
  ipcMain,
  Tray,
  Menu,
  shell,
} = require("electron");
const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

let overlayVisible;

function create_tray() {
  tray = new Tray(
    path.join(__dirname, "backend", "public", "assets", "images", "logo.png")
  );

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Toggle Overlay",
      click: () => {
        if (overlayWindow.isVisible()) {
          overlayWindow.hide();
        } else {
          overlayWindow.show();
        }
      },
    },
    {
      label: "Go to Webpage",
      click: () => {
        shell.openExternal("http://127.0.0.1:5000/");
        overlayWindow.hide();
      },
    },
    {
      label: "Restart",
      click: () => {
        flaskProcess.kill();

        setTimeout(() => {
          app.relaunch();
          app.exit(0);
        }, 100);
      },
    },
    {
      label: "Quit",
      click: () => {
        app.isQuiting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip("Ai Companion");
  tray.setContextMenu(contextMenu);

  tray.on("double-click", () => {
    mainWindow.show();
  });
}

function create_overlay_window() {
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
    skipTaskbar: false,
    icon: path.join(
      __dirname,
      "backend",
      "public",
      "assets",
      "images",
      "logo.png"
    ),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  overlayWindow.loadURL("http://127.0.0.1:5000/overlay");
}

function waitForFlask(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      http
        .get(url, () => {
          resolve();
        })
        .on("error", () => {
          if (Date.now() - start > timeout) {
            reject(new Error("Flask did not start in time"));
          } else {
            setTimeout(check, 100);
          }
        });
    }

    check();
  });
}

app.whenReady().then(async () => {
  let flaskPath;

  if (app.isPackaged) {
    flaskPath = path.join(process.resourcesPath, "backend", "dist", "app.exe");
    flaskProcess = spawn(flaskPath, [], { stdio: "inherit", shell: false });
  } else {
    flaskPath = path.join(__dirname, "backend", "app.py");
    flaskProcess = spawn("python", [flaskPath], {
      stdio: "inherit",
      shell: false,
    });
  }

  try {
    await waitForFlask("http://127.0.0.1:5000");
    console.log("Flask is ready!");
  } catch (err) {
    console.error(err);
    return;
  }

  create_overlay_window();
  create_tray();

  globalShortcut.register("Control+Shift+O", () => {
    overlayVisible = !overlayVisible;
    overlayWindow.webContents.send("toggle-visibility");
  });
});

// Electron API
const api = express();
const PORT = 8123;

api.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

api.get("/show", (req, res) => {
  overlayWindow.show();
  showingOverlay = true;
  res.send("shown");
});

api.get("/hide", (req, res) => {
  overlayWindow.hide();
  showingOverlay = false;
  res.send("hidden");
});

api.get("/status", (req, res) => {
  res.json({
    visible: true,
  });
});

api.listen(PORT, () => {
  console.log("Electron overlay API running on port", PORT);
});

ipcMain.on("set-ignore-mouse-events", (event, ignore, options) => {
  overlayWindow.setIgnoreMouseEvents(ignore, options);
});

app.on("will-quit", () => {
  if (flaskProcess) {
    spawn("taskkill", ["/pid", flaskProcess.pid, "/f", "/t"]);
  }
});
