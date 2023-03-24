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

/* Main Function */
electron.ipcRenderer.invoke("getDataPath").then(async (dataPath) => {
  /* Usefull HTML elements */
  const addServerBtn = document.querySelector("#add-server"),
    warningDiv = document.querySelector("#warning"),
    addServerModal = document.querySelector("#modal"),
    saveServerBtn = document.querySelector("#modal-content-addbtn");

  /* Modal input fields and related elements */
  const inputPrettyName = document.querySelector("#modal-content-prettyname"),
    inputIP = document.querySelector("#modal-content-ip"),
    inputPort = document.querySelector("#modal-content-port"),
    inputPasswd = document.querySelector("#modal-content-passwd"),
    modalTitle = document.querySelector("#modal-content-title");

  addServerBtn.addEventListener("click", () => {
    modalTitle.innerHTML = "New Server";
    addServerModal.style.setProperty("display", "block");
  });

  window.addEventListener("click", (e) => {
    if (e.target == addServerModal) {
      resetModal();
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

  /* At each data change, update the selected server in the list */
  async function updateServer(index, server) {
    /* Try/Catch to detect if server is not responding */
    try {
      /* Create the div before the fetch to avoid disordered data in the list */
      let div = document.querySelector(`#server-${index}`);
      if (!div) {
        document.querySelector("#gridLayout").innerHTML += `
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

      const data = JSON.parse(response.data);
      div.style.setProperty("--outline-color", "#2eff8c");
      div.innerHTML = `<div onclick="window.editServer(${index})" class="card-btn card-edit">
      <svg aria-hidden="true" role="img" width="16" height="16" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill="currentColor"></path></svg>
    </div><div onclick="window.deleteServer(${index});" class="card-btn card-delete">
      <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>
    </div>
      <div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(${
        data.serverId
      })</span></div>
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
            outlineColor = "#ffa83e";
            break;
        }
      }
      div.style.setProperty("--outline-color", outlineColor);
      div.innerHTML = `<div onclick="window.editServer(${index})" class="card-btn card-edit">
      <svg aria-hidden="true" role="img" width="16" height="16" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill="currentColor"></path></svg>
    </div><div onclick="window.deleteServer(${index});" class="card-btn card-delete">
      <svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>
    </div>
      <div class="card-title">${server.prettyname.toLowerCase()} <span id="card-id">(-----)</span></div>
      <div class="card-platform">Running: -----</div>
      <div class="card-usage">RAM: ----- (----- %)</div>
      <div class="card-cpu-usage">CPU: ----- %</div>
      <div class="card-status">${status}</div>`;
    }
  }

  /* Update the server list */
  async function updateServerList() {
    fileserverlist = await JSON.parse(fs.readFileSync(filepath, "utf8"))
      .servers;
    for await (let [index, server] of fileserverlist.entries()) {
      updateServer(index, server);
      console.log(index);
    }
    document.querySelector("#loading").innerHTML = "";
    warningDiv.innerHTML = warnStatus
      ? "❗ some servers deserve your attention"
      : "✅ all servers are up and running";
  }

  /* Do it and do it again */
  updateServerList();
  setInterval(updateServerList, 2500);
});

/* Get the version number from the main process and display it */
electron.ipcRenderer.invoke("getAppVersion").then(async (versionNumber) => {
  document.querySelector("#version").innerHTML = versionNumber;
});
