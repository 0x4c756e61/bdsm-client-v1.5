const { app, BrowserWindow, ipcMain } = require("electron"),
  fs = require("node:fs"),
  path = require("node:path");

if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  var initPath = path.join(app.getPath("userData"), "window.json");
  var data;
  try {
    data = require(initPath);
  } catch (e) {}

  const mainWindow = new BrowserWindow({
    x: data && data.bounds.x ? data.bounds.x : 20,
    y: data && data.bounds.y ? data.bounds.y : 20,
    minWidth: 800,
    minHeight: 400,
    width: data && data.bounds.width ? data.bounds.width : 800,
    height: data && data.bounds.height ? data.bounds.height : 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
      sandbox: false,
    },
    titleBarStyle: "hidden",
    titleBarOverlay: {
      height: 30,
      color: "#0072DB",
      symbolColor: "#ffffff",
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.openDevTools();

  mainWindow.on("close", function () {
    var data = {
      bounds: mainWindow.getBounds(),
    };
    fs.writeFileSync(initPath, JSON.stringify(data));
  });
};

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

ipcMain.handle("getDataPath", () => {
  return app.getPath("userData");
});

// Reload electron when file is edited in dev mode

// try {
//   require("electron-reloader")(module);
// } catch {}
