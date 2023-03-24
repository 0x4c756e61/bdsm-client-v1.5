/*
Copyright 2023 Firmin B.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/* Dependencies */
const { app, BrowserWindow, ipcMain } = require("electron"),
  fs = require("node:fs"),
  path = require("node:path");

if (require("electron-squirrel-startup")) {
  app.quit();
}

require("update-electron-app")();

/* Create window */
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
    backgroundColor: "#13111c",
    icon: path.join(__dirname, "assets/icon.ico"),
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
      color: "#13111c",
      symbolColor: "#ffffff",
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // mainWindow.webContents.openDevTools();

  /* Save window position and size on close */
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

/* Get data path for the renderer process */
ipcMain.handle("getDataPath", () => {
  return app.getPath("userData");
});

/* Get app version for the renderer process */
ipcMain.handle("getAppVersion", () => {
  return app.getVersion();
});

/* Open dev tools for the renderer process */
ipcMain.handle("openDevTools", () => {
  BrowserWindow.getFocusedWindow().webContents.openDevTools();
});

// // Reload electron when file is edited in dev mode
// try {
//   require("electron-reloader")(module);
// } catch {}
