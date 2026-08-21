const { app, BrowserWindow } = require("electron");
const path = require("path");

const iconPath = path.join(__dirname, "logo.png");

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    resizable: false,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
    },
  });

  win.loadFile(path.join(__dirname, "index.html"));
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  // On macOS the window "icon" option is ignored, the dock icon is used instead.
  if (process.platform === "darwin" && app.dock) {
    app.dock.setIcon(iconPath);
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
