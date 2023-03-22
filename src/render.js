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
const path = require("node:path"),
  axios = require("axios"),
  fs = require("node:fs"),
  electron = require("electron");

/* Global variables */
let fileserverlist;
let warnStatus = false;

/* Main Function */
electron.ipcRenderer.invoke("getDataPath").then(async (dataPath) => {
  /* Usefull HTML elements */
  const addServerBtn = document.getElementById("add-server"),
    warningDiv = document.getElementById("warning");

  console.log(dataPath)

  const filepath = path.join(dataPath, "servers.json");
  if (!fs.existsSync(filepath)) {
    console.log("no file, creating one");
    fs.writeFileSync(filepath, `{"servers":[]}`);
    return;
  }

  /* At each data change, update the selected server in the list */
  async function updateServer(index, server) {
    /* Try/Catch to detect if server is not responding */
    try {
      /* Create the div before the fetch to avoid disordered data in the list */
      let div = document.querySelector(`#server-${index}`);
      if (!div) {
        document.querySelector(
          "#gridLayout"
        ).innerHTML += `
        <div class="card" id="server-${index}"></div>
        `;
      }

      const response = await axios({
        method: "post",
        url: `http://${server.ip}:${server.port}/update`,
        responseType: "stream",
        headers: {
          auth: server.password,
        },
      });
      // console.log(response.data);

      let outlineColor = "#2eff8c";
      const data = JSON.parse(response.data);
      div.style.setProperty("--outline-color", outlineColor)
      div.innerHTML = `<div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(${data.serverId})</span></div>
      <div class="card-platform">Running: ${data.osPlatform}</div>
      <div class="card-usage">RAM: ${data.ramUsage} (${data.ramPercent})</div>
      <div class="card-cpu-usage">CPU: ${data.cpuUsage.toFixed(2)} %</div>
      <div class="card-status">🟢</div>`;
    } catch (error) {
      let div = document.querySelector(`#server-${index}`);
      if (!div) {
        document.querySelector(
          "#gridLayout"
        ).innerHTML += `<div id="server-${index}" class="card"></div>`;
      }
      warnStatus = true;
      let status = "🔴";
      let outlineColor = "#ff4943";
      if (error.response) {
        switch (error.response.status) {
          case 200:
            status = "🟢";
            outlineColor = "#2eff8c";
            break;
          case 403:
            status = "🔐";
            outlineColor = "#f1ff73";
            break;
          default:
            status = "🟠";
            outlineColor = "#ffa83e"
            break;
        }
      }
      div.style.setProperty("--outline-color", outlineColor)
      div.innerHTML = `<div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(-----)</span></div>
      <div class="card-platform">Running: -----</div>
      <div class="card-usage">RAM: ----- (----- %)</div>
      <div class="card-cpu-usage">CPU: ----- %</div>
      <div class="card-status">${status}</div>`;
    }

    if (index == fileserverlist.length - 1) {
      document.getElementById("loading").innerHTML = "";
      warningDiv.innerHTML = warnStatus
        ? "❗ some servers deserve your attention"
        : "✅ all servers are up and running";
    }
  }

  /* Update the server list */
  function updateServerList() {
    console.log("Updating server list");
    warnStatus = false;
    fileserverlist = JSON.parse(fs.readFileSync(filepath, "utf8")).servers;
    for (let [index, server] of fileserverlist.entries()) {
      updateServer(index, server);
    }
  }

  /* Do it and do it again */
  updateServerList();
  setInterval(updateServerList, 2000);
});

/* Get the version number from the main process and display it */
electron.ipcRenderer.invoke("getAppVersion").then(async (versionNumber) => {
  document.getElementById("version").innerHTML = versionNumber;
});
