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
  path = require("node:path"),
  discordRPC = require("discord-rpc");

let userSettings
const clientId = "1122502251253076080";
let rpcClient;

if (require("electron-squirrel-startup")) app.quit();

/* Update electron app */
require("update-electron-app")();

/* Create window */
const createWindow = () => {
  const initPath = path.join(app.getPath("userData"), "window.json");
  let data;
  try {
    data = require(initPath);
  } catch (e) { }

  const mainWindow = new BrowserWindow({
    x: data && data.bounds.x ? data.bounds.x : 20,
    y: data && data.bounds.y ? data.bounds.y : 20,
    minWidth: 800,
    minHeight: 500,
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

  mainWindow.webContents.openDevTools();

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
ipcMain.handle("getDataPath", () => app.getPath("userData"));

/* Get app version for the renderer process */
ipcMain.handle("getAppVersion", () => app.getVersion());

/* Open dev tools for the renderer process */
ipcMain.handle("openDevTools", () =>
  BrowserWindow.getFocusedWindow().webContents.openDevTools()
);

if (fs.existsSync(path.join(app.getPath("userData"), "servers.json"))) {
  userSettings = require(path.join(app.getPath("userData"), "servers.json")).settings;

  if (userSettings.discordRichPresence) {
    let date = new Date();
    rpcClient = new discordRPC.Client({ transport: "ipc" });
    console.log("Discord RPC client created");
    rpcClient.on("ready", () => {
      console.log("Discord RPC client ready");
      rpcClient.setActivity({
        state: "Monitoring servers...",
        startTimestamp: date,
        largeImageKey: "https://i.imgur.com/uvfVu0P.png",
        largeImageText: app.getVersion(),
        instance: false,
        buttons: [{ label: 'Github', url: 'https://github.com/firminsurgithub/bdsm-client' }]
      });
    });
    rpcClient.login({ clientId }).catch(console.error);
    ipcMain.on("update-rpc", (event, arg) => {
      if (userSettings.discordRichPresence) {
        rpcClient.setActivity({
          state: arg.state,
          details: arg.details,
          startTimestamp: date,
          largeImageKey: "https://i.imgur.com/uvfVu0P.png",
          largeImageText: app.getVersion(),
          instance: false,
          buttons: [{ label: 'Github', url: 'https://github.com/firminsurgithub/bdsm-client' }]
        });
      }
    });
  }
}