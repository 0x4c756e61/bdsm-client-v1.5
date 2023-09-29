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
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, Notification } = require("electron"),
  fs = require("fs"),
  path = require("path"),
  discordRPC = require("discord-rpc");

let userSettings, rpcClient;

const clientId = "1122502251253076080";

if (require("electron-squirrel-startup")) app.quit();

/* Update electron app */
require("update-electron-app")();

/* Get platform icon */
function getPlatformIcon(filename) {
  let ext;
  switch (process.platform) {
    case 'win32':
      ext = 'ico'
      break
    case 'darwin':
      ext = 'icns'
    case 'linux':
      ext = 'png'
      break
    default:
      ext = 'png'
      break
  }

  return path.join(__dirname, 'assets', 'imgs', `${filename}.${ext}`)
}

/* Create menu */
const menu = Menu.buildFromTemplate([
  {
    label: app.name,
    submenu: [
      {
        label: "About BDSM",
        click: () => {
          dialog.showMessageBox({
            title: "About BDSM",
            type: "info",
            message: "BDSM is a server monitor app.\n\nMade by Firmin B.",
            buttons: ["Close", "Github"],
            defaultId: 0,
            icon: getPlatformIcon('icon')
          }).then((result) => {
            if (result.response === 1) {
              shell.openExternal("https://github.com/firminsurgithub/bdsm-client");
            }
          });
        }
      },
      {
        label: "Quit",
        accelerator: "CmdOrCtrl+Q",
        click: () => {
          app.quit();
        },
      },
    ]
  }
]);

Menu.setApplicationMenu(menu);

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
    icon: getPlatformIcon('icon'),
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

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
    if (process.platform === "darwin") {
      app.dock.setBadge("Dev");
      app.dock.setIcon(getPlatformIcon('icon'));
    }
  }

  /* Save window position and size on close */
  mainWindow.on("close", function () {
    let data = { bounds: mainWindow.getBounds() };
    fs.writeFileSync(initPath, JSON.stringify(data));
  });
};

app.on("ready", createWindow);

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

/* Get data path for the renderer process */
ipcMain.handle("getDataPath", () => app.getPath("userData"));

/* Get app version for the renderer process */
let appVersion = () => { return `${app.getVersion()}${app.isPackaged ? "" : " (Dev mode)"}` };

ipcMain.handle("getAppVersion", () => appVersion());

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
        largeImageText: appVersion(),
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
          largeImageText: appVersion(),
          instance: false,
          buttons: [{ label: 'Github', url: 'https://github.com/firminsurgithub/bdsm-client' }]
        });
      }
    });
  }
}

ipcMain.on("export-config", () => {
  dialog.showSaveDialog({
    title: "Export config",
    defaultPath: path.join(app.getPath("documents"), "bdsm-config.json"),
    filters: [{ name: "BDSM config file", extensions: ["json"] }],
  }).then((result) => {
    if (!result.canceled) {
      fs.copyFileSync(path.join(app.getPath("userData"), "servers.json"), result.filePath);
    }
  }).catch((err) => {
    dialog.showErrorBox("Error", err)
  })
});

ipcMain.handle("import-config", async () => {
  let out = false
  await dialog.showOpenDialog({
    title: "Import config",
    defaultPath: path.join(app.getPath("documents")),
    filters: [{ name: "BDSM config file", extensions: ["json"] }],
  }).then(async (result) => {
    if (!result.canceled) {
      let datas
      const errorMissingDatas = () => dialog.showErrorBox("Error", "Seems to be missing datas in the file or the file isn't a BDSM config file")

      try {
        datas = await JSON.parse(fs.readFileSync(result.filePaths[0], "utf8"))
      } catch (error) {
        return dialog.showErrorBox("Error", "JSON Parse error")
      }

      if (datas.servers) {
        let serverIntegrity = true
        datas.servers.forEach(server => {
          if (!(server.prettyname && server.ip && server.port && server.password)) serverIntegrity = false
        })
        if (!serverIntegrity)
          return errorMissingDatas()
      }
      else
        return errorMissingDatas()

      if (datas.settings) {
        if (((typeof datas.settings.discordRichPresence) != "boolean") || ((typeof datas.settings.confidentialMode) != "boolean") || ((typeof datas.settings.refresh) != "number")) return errorMissingDatas()
      }
      else
        return errorMissingDatas()

      await fs.writeFileSync(path.join(app.getPath("userData"), "servers.json"), JSON.stringify(datas));

      /* This variable tells to the renderer process that the config is imported */
      out = true;
    }
  }).catch((err) => {
    dialog.showErrorBox("Error", err)
  })
  return out;
});

ipcMain.on("error", (event, arg) => {
  dialog.showErrorBox("Error", arg);
});

ipcMain.on("offline-notification", () => {
  new Notification({
    title: "Offline alert!",
    body: "One or more servers deserve your attention"
  }).show();
});

ipcMain.on("online-notification", () => {
  new Notification({
    title: "Online alert!",
    body: "One or more servers are back online"
  }).show();
});