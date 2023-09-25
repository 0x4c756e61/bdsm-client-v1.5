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
    fs = require("node:fs"),
    electron = require("electron");

/* Global variables */
let fileserverlist;
let warnStatus = false;
let editingIndex = -1;
let viewingIndex = -1;
let settingsList = {
    refresh: 2500,
    confidentialMode: false,
    discordRichPresence: false
};

/* Usefull HTML elements */
const addServerBtn = document.querySelector("#add-server"),
    warningDiv = document.querySelector("#warning"),
    addServerModal = document.querySelector("#modal"),
    viewServerModal = document.querySelector("#server-info"),
    saveServerBtn = document.querySelector("#modal-content-addbtn");
const settingsBtn = document.querySelector("#set-soft"),
    settingsModal = document.querySelector("#soft-settings"),
    saveSettingsBtn = document.querySelector("#soft-settings-save"),
    importConfBtn = document.querySelector("#import-config"),
    exportConfBtn = document.querySelector("#export-config");
const inputPrettyName = document.querySelector("#modal-content-prettyname"),
    inputIP = document.querySelector("#modal-content-ip"),
    inputPort = document.querySelector("#modal-content-port"),
    inputPasswd = document.querySelector("#modal-content-passwd"),
    modalTitle = document.querySelector("#modal-content-title");
const viewPrettyName = document.querySelector("#view-server-name"),
    viewCpu = document.querySelector("#view-server-cpu"),
    viewRam = document.querySelector("#view-server-ram"),
    viewUptime = document.querySelector("#view-server-uptime"),
    viewHostname = document.querySelector("#view-server-hostname"),
    viewCpuModel = document.querySelector("#view-cpu-model"),
    viewServerIP = document.querySelector("#view-server-ip"),
    viewPlatform = document.querySelector("#view-server-platform"),
    viewOS = document.querySelector("#view-server-os");

const dragArea = document.querySelector(".drag-area");

/* Main Function */
(async () => {
    const dataPath = await electron.ipcRenderer.invoke("getDataPath");
    const srvfilepath = path.join(dataPath, "servers.json");

    addServerBtn.addEventListener("click", () => {
        modalTitle.innerHTML = "New Server";
        addServerModal.style.setProperty("display", "block");
    });

    document.querySelectorAll("#soft-settings-modal .switch").forEach((element) => {
        document.querySelector(`#${element.id} .true`).addEventListener("click", () => {
            document.querySelector(`#${element.id} .true`).classList.add("active");
            document.querySelector(`#${element.id} .false`).classList.remove("active");
        });
        document.querySelector(`#${element.id} .false`).addEventListener("click", () => {
            document.querySelector(`#${element.id} .false`).classList.add("active");
            document.querySelector(`#${element.id} .true`).classList.remove("active");
        });
    });

    settingsBtn.addEventListener("click", () => {
        settingsList = JSON.parse(fs.readFileSync(path.join(srvfilepath))).settings || settingsList;
        document.querySelector("#refresh-time").value = settingsList.refresh;
        switch (settingsList.confidentialMode) {
            case true:
                document.querySelector("#confidential-mode .false").classList.remove("active");
                document.querySelector("#confidential-mode .true").classList.add("active");
                break;
            default:
                document.querySelector("#confidential-mode .true").classList.remove("active");
                document.querySelector("#confidential-mode .false").classList.add("active");
                break;
        }
        switch (settingsList.discordRichPresence) {
            case true:
                document.querySelector("#discord-rich .false").classList.remove("active");
                document.querySelector("#discord-rich .true").classList.add("active");
                break;
            default:
                document.querySelector("#discord-rich .true").classList.remove("active");
                document.querySelector("#discord-rich .false").classList.add("active");
                break;
        }
        settingsModal.style.setProperty("display", "block");
    });

    document.querySelector("#close-view").addEventListener("click", () => {
        resetViewModal();
    });

    document.querySelector("#version").addEventListener("contextmenu", () => {
        electron.ipcRenderer.invoke("openDevTools");
    });

    window.addEventListener("mousedown", (e) => {
        if (e.target == addServerModal || e.target == viewServerModal || e.target == settingsModal) {
            resetModal();
            resetViewModal();
            resetSettingsModal();
        }
    });

    if (!fs.existsSync(srvfilepath) || !(JSON.parse(fs.readFileSync(srvfilepath)).servers) || !(JSON.parse(fs.readFileSync(srvfilepath)).settings)) {
        console.log("no file or file corrupted, creating one");
        fs.writeFileSync(srvfilepath, JSON.stringify({ servers: [], settings: settingsList }));
    }

    try {
        settingsList = JSON.parse(fs.readFileSync(path.join(srvfilepath))).settings;
    } catch (error) {
        electron.ipcRenderer.send("error", "Error while reading settings file: \n" + error);
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
        viewHostname.innerHTML = "---";
        viewPlatform.innerHTML = "---";
        viewOS.innerHTML = "---";
        viewCpuModel.innerHTML = "---";
        viewServerIP.innerHTML = "---";
        viewingIndex = -1;
    }

    function resetSettingsModal() {
        settingsModal.style.setProperty("display", "none");
    }

    function saveSettings() {
        const refreshTime = parseInt(document.querySelector("#refresh-time").value);
        const confidentialMode = document.querySelector("#confidential-mode .active").classList.contains("true");
        const discordRichPresence = document.querySelector("#discord-rich .active").classList.contains("true");
        updateFileServerList();
        settingsList = {
            refresh: refreshTime,
            confidentialMode: confidentialMode,
            discordRichPresence: discordRichPresence
        }
        fs.writeFileSync(srvfilepath, JSON.stringify({ servers: fileserverlist, settings: settingsList }));
    }

    saveSettingsBtn.addEventListener("click", () => {
        saveSettings();
        resetSettingsModal();
    });

    function updateFileServerList() {
        fileserverlist = JSON.parse(fs.readFileSync(srvfilepath, "utf8")).servers;
        settingsList = JSON.parse(fs.readFileSync(srvfilepath, "utf8")).settings;
    }

    importConfBtn.addEventListener("click", () => {
        electron.ipcRenderer.invoke('import-config').then((success) => {
            if (success)
                location.reload();
        });
    });

    exportConfBtn.addEventListener("click", () => {
        updateFileServerList();
        electron.ipcRenderer.send('export-config');
    });

    function saveServer(index) {
        let errorForm = false;
        if (!inputPrettyName.value) {
            inputPrettyName.style.setProperty("border", "1px solid red");
            errorForm = true;
        } else {
            inputPrettyName.style.setProperty(
                "border",
                "solid 1px hsl(246, 11%, 22%)"
            );
        }
        if (!inputIP.value) {
            inputIP.style.setProperty("border", "1px solid red");
            errorForm = true;
        } else {
            inputIP.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
        }
        if (!inputPasswd.value) {
            inputPasswd.style.setProperty("border", "1px solid red");
            errorForm = true;
        } else {
            inputPasswd.style.setProperty("border", "solid 1px hsl(246, 11%, 22%)");
        }

        if (errorForm) return;

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
            srvfilepath,
            JSON.stringify({
                servers: fileserverlist,
                settings: settingsList,
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
        fs.writeFileSync(srvfilepath, JSON.stringify({ servers: fileserverlist, settings: settingsList }));
        document.querySelector("#gridLayout").innerHTML = "";
        document.querySelector("#warning").innerHTML = "🔄️ loading...";
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

    window.viewServer = async (index) => {
        viewingIndex = index;
        viewServerModal.style.setProperty("display", "block");
        updateServer(index, await JSON.parse(fs.readFileSync(srvfilepath, "utf8")).servers[index]);
    };

    async function updateViewServer(data, server, error, status) {
        viewPrettyName.innerHTML = `${status} ${server.prettyname.toUpperCase()} <span>(${error ? "---" : data.serverId})</span>`;
        viewCpu.innerHTML = error ? "---" : `${data.cpuUsage.toFixed(2)}% <span class="detail">(${data.cpuArch})</span>`;
        viewRam.innerHTML = error ? "---" : `${data.ramUsage} <span class="detail">(${data.ramPercent})</span>`;
        viewUptime.innerHTML = error ? "---" : `${Math.floor(data.serverUptime / 3600)}H ${Math.floor((data.serverUptime % 3600) / 60)}M`;
        viewHostname.innerHTML = error ? "---" : data.serverHostname;
        viewPlatform.innerHTML = error ? "---" : data.osType;
        viewOS.innerHTML = error ? "---" : data.osVersion;
        viewCpuModel.innerHTML = error ? "---" : `${data.cpuList[0].model} <span class="detail">(${data.cpuList.length > 1 ? data.cpuList.length + " cores" : "1 core"})</span>`;

        if (!settingsList.confidentialMode) {
            const viewServerIPText = viewServerIP.innerHTML = `${server.ip} <svg id="ip-clipboard-logo" xmlns="http://www.w3.org/2000/svg" height="0.7em" viewBox="0 0 384 512"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#aaaaaac2}</style><path d="M280 64h40c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V128C0 92.7 28.7 64 64 64h40 9.6C121 27.5 153.3 0 192 0s71 27.5 78.4 64H280zM64 112c-8.8 0-16 7.2-16 16V448c0 8.8 7.2 16 16 16H320c8.8 0 16-7.2 16-16V128c0-8.8-7.2-16-16-16H304v24c0 13.3-10.7 24-24 24H192 104c-13.3 0-24-10.7-24-24V112H64zm128-8a24 24 0 1 0 0-48 24 24 0 1 0 0 48z"/></svg>`;

            document.querySelector("#ip-clipboard-logo").style.setProperty("cursor", "pointer");

            document.querySelector("#ip-clipboard-logo").addEventListener("click", () => {
                electron.clipboard.writeText(server.ip);

                viewServerIP.innerHTML = `${server.ip} <svg xmlns="http://www.w3.org/2000/svg" height="0.7em" viewBox="0 0 384 512"><!--! Font Awesome Free 6.4.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#2eff8c}</style><path d="M192 0c-41.8 0-77.4 26.7-90.5 64H64C28.7 64 0 92.7 0 128V448c0 35.3 28.7 64 64 64H320c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H282.5C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM305 273L177 401c-9.4 9.4-24.6 9.4-33.9 0L79 337c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L271 239c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>`;
            
                setTimeout(() => { viewServerIPText }, 1500);
            });
        
        } else {
            viewServerIP.innerHTML = "HIDDEN";
        }

        if (settingsList.discordRichPresence) {
            electron.ipcRenderer.send('update-rpc', { details: `Viewing ${server.prettyname}`, state: error ? "Server offline" : `CPU : ${data.cpuUsage.toFixed(2)}% | RAM : ${data.ramPercent}` });
        }
    }

    /* At each data change, update the selected server in the list */
    async function updateServer(index, server) {
        /* Create the div before the fetch to avoid disordered data in the list */
        let div = document.querySelector(`#server-${index}`);
        if (!div) {
            const cardDiv = document.createElement("div");
            cardDiv.className = "card";
            cardDiv.id = `server-${index}`;

            const editBtn = document.createElement("div");
            editBtn.className = "card-btn card-edit";
            editBtn.onclick = () => window.editServer(index);
            editBtn.innerHTML = `<svg aria-hidden="true" role="img" width="16" height="16" viewBox="0 0 24 24"><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2929 9.8299L19.9409 9.18278C21.353 7.77064 21.353 5.47197 19.9409 4.05892C18.5287 2.64678 16.2292 2.64678 14.817 4.05892L14.1699 4.70694L19.2929 9.8299ZM12.8962 5.97688L5.18469 13.6906L10.3085 18.813L18.0201 11.0992L12.8962 5.97688ZM4.11851 20.9704L8.75906 19.8112L4.18692 15.239L3.02678 19.8796C2.95028 20.1856 3.04028 20.5105 3.26349 20.7337C3.48669 20.9569 3.8116 21.046 4.11851 20.9704Z" fill="currentColor"></path></svg>`;

            const deleteBtn = document.createElement("div");
            deleteBtn.className = "card-btn card-delete";
            deleteBtn.onclick = () => window.deleteServer(index);
            deleteBtn.innerHTML = `<svg aria-hidden="true" role="img" width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M15 3.999V2H9V3.999H3V5.999H21V3.999H15Z"></path><path fill="currentColor" d="M5 6.99902V18.999C5 20.101 5.897 20.999 7 20.999H17C18.103 20.999 19 20.101 19 18.999V6.99902H5ZM11 17H9V11H11V17ZM15 17H13V11H15V17Z"></path></svg>`;

            const viewBtn = document.createElement("div");
            viewBtn.className = "card-btn card-view";
            viewBtn.onclick = () => window.viewServer(index);
            viewBtn.innerHTML = `<svg width="16" height="16" xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 576 512"><!--! Font Awesome Pro 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/></svg>`;

            const cardTitle = document.createElement("div");
            cardTitle.className = "card-title";
            cardTitle.id = `card-title-${index}`;
            cardTitle.innerHTML = `${server.prettyname.toLowerCase()} <span id="card-id">(---)</span>`;

            const cardPlatform = document.createElement("div");
            cardPlatform.className = "card-platform";
            cardPlatform.id = `card-platform-${index}`;
            cardPlatform.textContent = "Running: ---";

            const cardUsage = document.createElement("div");
            cardUsage.className = "card-usage";
            cardUsage.id = `card-usage-${index}`;
            cardUsage.textContent = "RAM: ---";

            const cardCpuUsage = document.createElement("div");
            cardCpuUsage.className = "card-cpu-usage";
            cardCpuUsage.id = `card-cpu-usage-${index}`;
            cardCpuUsage.textContent = "CPU: ---%";

            const cardStatus = document.createElement("div");
            cardStatus.className = "card-status";
            cardStatus.id = `card-status-${index}`;
            cardStatus.textContent = "❓";

            cardDiv.appendChild(editBtn);
            cardDiv.appendChild(deleteBtn);
            cardDiv.appendChild(viewBtn);
            cardDiv.appendChild(cardTitle);
            cardDiv.appendChild(cardPlatform);
            cardDiv.appendChild(cardUsage);
            cardDiv.appendChild(cardCpuUsage);
            cardDiv.appendChild(cardStatus);

            document.querySelector("#gridLayout").appendChild(cardDiv);
            div = document.querySelector(`#server-${index}`);
        }

        let requestCode = 0;

        await fetch(`http://${server.ip}:${server.port}/update`, {
            method: "POST",
            headers: {
                auth: server.password
            }
        }).then((response) => { requestCode = response.status; return response.json() }).then((data) => {
            div.style.setProperty("--outline-color", "#2eff8c");
            document.querySelector(
                `#card-title-${index}`
            ).innerHTML = `${server.prettyname.toLowerCase()} <span id="card-id">(${data.serverId
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
                updateViewServer(data, server, false, "🟢");
            }
        }).catch((error) => {
            warnStatus = true;
            let status = "🔴";
            let outlineColor = "#ff4943";
            switch (requestCode) {
                case 200:
                    status = "🟢";
                    outlineColor = "#2eff8c";
                    break;
                case 403:
                    status = "🔐";
                    outlineColor = "#f1ff73";
                    break;
            }
            div.style.setProperty("--outline-color", outlineColor);
            document.querySelector(`#card-status-${index}`).innerHTML = status;
            document.querySelector(
                `#card-title-${index}`
            ).innerHTML = `${server.prettyname.toLowerCase()} <span id="card-id">(---)</span>`;
            document.querySelector(
                `#card-platform-${index}`
            ).innerHTML = `Running: ---`;
            document.querySelector(`#card-usage-${index}`).innerHTML = `RAM: ---`;
            document.querySelector(
                `#card-cpu-usage-${index}`
            ).innerHTML = `CPU: ---%`;
            if (viewingIndex === index) {
                updateViewServer(null, server, true, status);
            }
        });
    }

    /* Update the server list */
    async function updateServerList() {
        updateFileServerList();
        for await (let [index, server] of fileserverlist.entries()) {
            updateServer(index, server);
        }
        if (fileserverlist.length == 0) {
            warningDiv.innerHTML = "➕ ADD YOUR SERVERS";
        }
        else {
            warningDiv.innerHTML = warnStatus
                ? "❗ SOME SERVERS DESERVE YOUR ATTENTION"
                : "✅ ALL SERVERS ARE UP AND RUNNING";
        }
        if (viewingIndex == -1 && settingsList.discordRichPresence) {
            electron.ipcRenderer.send('update-rpc', { details: `Monitoring servers...`, state: warnStatus ? "Some servers are down ❗" : "All is fine 👌" });
        }
        setTimeout(updateServerList, settingsList.refresh);
        warnStatus = false;
    }
    updateServerList();
})()

/* Get the version number from the main process and display it */
electron.ipcRenderer.invoke("getAppVersion").then(async (versionNumber) => {
    document.querySelector("#version").innerHTML = versionNumber;
});

if (process.platform === "linux") {
    document.querySelector('.drag-area').remove()
}
else if (process.platform === "darwin") {
    dragArea.style.setProperty("height", "30px");
    document.querySelector("#app").style.setProperty("padding-top", "15px");
    document.querySelector("#logo").remove();
}