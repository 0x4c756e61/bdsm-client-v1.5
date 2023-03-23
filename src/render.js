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
        warningDiv = document.getElementById("warning"),
        addServerModal = document.getElementById("modal"),
        saveServerBtn = document.getElementById("modal-content-addbtn");

  /* Modal input fields */
  const inputPrettyName = document.getElementById("modal-content-prettyname"),
        inputIP = document.getElementById("modal-content-ip"),
        inputPort = document.getElementById("modal-content-port"),
        inputPasswd = document.getElementById("modal-content-passwd");

  addServerBtn.addEventListener("click", () => {
    addServerModal.style.setProperty("display", "block");
  })

  window.addEventListener("click", e => {
    if (e.target == addServerModal) {
      addServerModal.style.setProperty("display", "none");
    }
  })

  const filepath = path.join(dataPath, "servers.json");
  if (!fs.existsSync(filepath)) {
    console.log("no file, creating one");
    fs.writeFileSync(filepath, `{"servers":[]}`);
    return;
  }

  saveServerBtn.addEventListener("click", () => {
    let serverJson = JSON.parse(fs.readFileSync(filepath));
    serverJson["servers"].push(JSON.parse(`{
      "prettyname": "${inputPrettyName.value}",
      "ip": "${inputIP.value}",
      "port": ${inputPort.value},
      "password": "${inputPasswd.value}"
    }`));
    
    // console.log(JSON.stringify(serverJson));
    fs.writeFileSync(filepath, JSON.stringify(serverJson));
    addServerModal.style.setProperty("display", "none");
  })

  window.deleteServer = (index) => {
    document.querySelector(`#server-${index}`).remove();
    let serverJson = JSON.parse(fs.readFileSync(filepath));
    serverJson["servers"] = serverJson["servers"].splice(index, index)
    fs.writeFileSync(filepath, JSON.stringify(serverJson));
  }

  // window.querySelectorAll("#card-delete").forEach(e => {
  //   console.log(e)
  // });
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
      div.innerHTML = `<div onclick="window.deleteServer(${index});" class="card-delete">
      <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>
    </div>
      <div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(${data.serverId})</span></div>
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
      div.innerHTML = `<div onclick="window.deleteServer(${index});" class="card-delete">
      <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>
    </div>
      <div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(-----)</span></div>
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
