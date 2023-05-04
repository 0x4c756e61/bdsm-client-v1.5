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
let editingIndex = -1;
let viewingIndex = -1;

/* Main Function */
electron.ipcRenderer.invoke("getDataPath").then(async (dataPath) => {
  /* Usefull HTML elements */
  const addServerBtn = document.querySelector("#add-server"),
    warningDiv = document.querySelector("#warning"),
    addServerModal = document.querySelector("#modal"),
    viewServerModal = document.querySelector("#server-info"),
    saveServerBtn = document.querySelector("#modal-content-addbtn");

  /* Modal input fields and related elements */
  const inputPrettyName = document.querySelector("#modal-content-prettyname"),
    inputIP = document.querySelector("#modal-content-ip"),
    inputPort = document.querySelector("#modal-content-port"),
    inputPasswd = document.querySelector("#modal-content-passwd"),
    modalTitle = document.querySelector("#modal-content-title");

  /* View modal elements */
  const viewPrettyName = document.querySelector("#view-server-name"),
    viewCpu = document.querySelector("#view-server-cpu"),
    viewRam = document.querySelector("#view-server-ram"),
    viewUptime = document.querySelector("#view-server-uptime"),
    viewArch = document.querySelector("#view-server-arch"),
    viewCpuModel = document.querySelector("#view-cpu-model"),
    viewServerIP = document.querySelector("#view-server-ip"),
    viewOS = document.querySelector("#view-server-os");

  addServerBtn.addEventListener("click", () => {
    modalTitle.innerHTML = "New Server";
    addServerModal.style.setProperty("display", "block");
  });

  document.querySelector("#close-view").addEventListener("click", () => {
    resetViewModal();
  });

  document.querySelector("#version").addEventListener("contextmenu", () => {
    electron.ipcRenderer.invoke("openDevTools");
  });

  window.addEventListener("click", (e) => {
    if (e.target == addServerModal || e.target == viewServerModal) {
      resetModal();
      resetViewModal();
    }
  });

  const filepath = path.join(dataPath, "servers.json");
  if (!fs.existsSync(filepath)) {
    console.log("no file, creating one");
    fs.writeFileSync(filepath, `{"servers":[]}`);
    return;
  }

  function resetModal() {
    inputPrettyName.value = "";
    inputIP.value = "";
    inputPort.value = "";
    inputPasswd.value = "";
    inputPrettyName.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
    inputIP.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
    inputPasswd.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
    addServerModal.style.setProperty("display", "none");
    editingIndex = -1;
  }
  function resetViewModal() {
    viewServerModal.style.setProperty("display", "none");
    viewPrettyName.innerHTML = "-----";
    viewPrettyName.innerHTML = "---";
    viewCpu.innerHTML = "---";
    viewRam.innerHTML = "---";
    viewUptime.innerHTML = "---";
    viewArch.innerHTML = "---";
    viewOS.innerHTML = "---";
    viewCpuModel.innerHTML = "---";
    viewServerIP.innerHTML = "---";
    viewingIndex = -1;
  }

  function saveServer(index) {
    let errorform = false;
    if (!inputPrettyName.value) {
      inputPrettyName.style.setProperty("border", "1px solid red");
      errorform = true;
    } else {
      inputPrettyName.style.setProperty(
        "border",
        "solid 1px hsl(246, 11%, 22%)"
      );
    }
    if (!inputIP.value) {
      inputIP.style.setProperty("border", "1px solid red");
      errorform = true;
    } else {
      inputIP.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
    }
    if (!inputPasswd.value) {
      inputPasswd.style.setProperty("border", "1px solid red");
      errorform = true;
    } else {
      inputPasswd.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
    }
    if (errorform) {
      return;
    }

    let newJson = {
      prettyname: inputPrettyName.value,
      ip: inputIP.value,
      port: inputPort.value ? inputPort.value : 3040,
      password: inputPasswd.value,
    };
    if (index == -1) {
      fileserverlist.push(newJson);
    } else {
      fileserverlist[index] = newJson;
    }

    fs.writeFileSync(
      filepath,
      JSON.stringify({
        servers: fileserverlist,
      })
    );
    resetModal();
    updateServerList();
  }

  saveServerBtn.addEventListener("click", () => {
    saveServer(editingIndex);
    editingIndex = -1;
  });

  window.deleteServer = (index) => {
    document.querySelector(`#server-${index}`).remove();
    fileserverlist.splice(index, 1);
    fs.writeFileSync(filepath, JSON.stringify({ servers: fileserverlist }));
    document.querySelector("#gridLayout").innerHTML = "";
    document.querySelector("#loading").innerHTML = "Loading...";
    updateServerList();
  };

  window.editServer = (index) => {
    modalTitle.innerHTML = "Edit Server";
    inputPrettyName.value = fileserverlist[index].prettyname;
    inputIP.value = fileserverlist[index].ip;
    inputPort.value = fileserverlist[index].port;
    inputPasswd.value = fileserverlist[index].password;
    addServerModal.style.setProperty("display", "block");
    editingIndex = index;
  };

  window.viewServer = (index) => {
    viewingIndex = index;
    viewServerModal.style.setProperty("display", "block");
  };

  async function updateViewServer(data, server, error) {
    viewPrettyName.innerHTML = `${server.prettyname.toUpperCase()} <span>(${
      error ? "---" : data.serverId
    })</span>`;
    viewCpu.innerHTML = error ? "---" : `${data.cpuUsage.toFixed(2)}%`;
    viewRam.innerHTML = error ? "---" : `${data.ramUsage}`;
    viewUptime.innerHTML = error
      ? "---"
      : `${Math.floor(data.serverUptime / 3600)}H ${Math.floor(
          (data.serverUptime % 3600) / 60
        )}M`;
    viewArch.innerHTML = error ? "---" : data.cpuArch;
    viewOS.innerHTML = error ? "---" : data.osVersion;
    viewCpuModel.innerHTML = error
      ? "---"
      : `${data.cpuList[0].model} (${data.cpuList.length} cores)`;
    viewServerIP.innerHTML = `${server.ip}`;
  }

  /* At each data change, update the selected server in the list */
  async function updateServer(index, server) {
    /* Create the div before the fetch to avoid disordered data in the list */
    let div = document.querySelector(`#server-${index}`);
    if (!div) {
      document.querySelector(
        "#gridLayout"
      ).innerHTML += `<div class="card" id="server-${index}"><div onclick="window.editServer(${index})" class="card-btn card-edit">
        <svg aria-hidden="true" role="img" width="16" height="16" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill="currentColor"></path></svg>
        </div><div onclick="window.deleteServer(${index});" class="card-btn card-delete">
        <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>
    </div>
    <div onclick="window.viewServer(${index})" class="card-btn card-view">
      <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 576 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/></svg>
      </div>
      <div class="card-title" id="card-title-${index}">${server.prettyname.toLowerCase()} <span id="card-id">(---)</span></div>
      <div class="card-platform" id="card-platform-${index}">Running: ---</div>
      <div class="card-usage" id="card-usage-${index}">RAM: ---</div>
      <div cladd="card-cpu-usage" id="card-cpu-usage-${index}">CPU: ---%</div>
      <div class="card-status" id="card-status-${index}">❓</div></div>`;
    }
    /* Try/Catch to detect if server is not responding */
    try {
      const response = await axios({
        method: "post",
        url: `http://${server.ip}:${server.port}/update`,
        responseType: "stream",
        headers: {
          auth: server.password,
        },
      });

      const data = JSON.parse(response.data);
      div.style.setProperty("--outline-color", "#2eff8c");
      document.querySelector(
        `#card-title-${index}`
      ).innerHTML = `${server.prettyname.toLowerCase()} <span id="card-id">(${
        data.serverId
      })</span>`;
      document.querySelector(
        `#card-platform-${index}`
      ).innerHTML = `Running: ${data.osPlatform}`;
      document.querySelector(
        `#card-usage-${index}`
      ).innerHTML = `RAM: ${data.ramUsage} (${data.ramPercent})`;
      document.querySelector(
        `#card-cpu-usage-${index}`
      ).innerHTML = `CPU: ${data.cpuUsage.toFixed(2)}%`;
      document.querySelector(`#card-status-${index}`).innerHTML = `🟢`;

      if (viewingIndex == index) {
        updateViewServer(data, server, false);
      }
    } catch (error) {
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
            outlineColor = "#ffa83e";
            break;
        }
      }
      div.style.setProperty("--outline-color", outlineColor);
      document.querySelector(
        `#card-title-${index}`
      ).innerHTML = `${server.prettyname.toLowerCase()} <span id="card-id">(---)</span>`;
      document.querySelector(
        `#card-platform-${index}`
      ).innerHTML = `Running: ---}`;
      document.querySelector(`#card-usage-${index}`).innerHTML = `RAM: ---`;
      document.querySelector(
        `#card-cpu-usage-${index}`
      ).innerHTML = `CPU: ---%`;
      console.log(data);
      document.querySelector(`#card-status-${index}`).innerHTML = status;
      if (viewingIndex == index) {
        updateViewServer(null, server, true);
      }
    }
  }

  /* Update the server list */
  async function updateServerList() {
    fileserverlist = await JSON.parse(fs.readFileSync(filepath, "utf8"))
      .servers;
    for await (let [index, server] of fileserverlist.entries()) {
      await updateServer(index, server);
    }
    document.querySelector("#loading").innerHTML = "";
    warningDiv.innerHTML = warnStatus
      ? "❗ some servers deserve your attention"
      : "✅ all servers are up and running";
    warnStatus = false;
  }

  /* Do it and do it again */
  updateServerList();
  setInterval(updateServerList, 2500);
});

/* Get the version number from the main process and display it */
electron.ipcRenderer.invoke("getAppVersion").then(async (versionNumber) => {
  document.querySelector("#version").innerHTML = versionNumber;
});
