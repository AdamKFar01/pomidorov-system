const { app, BrowserWindow } = require("electron");
const path = require("path");

const iconPath = path.join(__dirname, "build/icon.png");

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
  // Dev only: unpackaged runs show the generic Electron icon otherwise. The
  // packaged app gets its icon from the bundle, which macOS masks for us.
  if (!app.isPackaged && process.platform === "darwin" && app.dock) {
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
