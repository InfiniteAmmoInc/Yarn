const electron = require("electron");
const ipcRenderer = electron.ipcRenderer;
const fs = require("fs");

let yarn = null;

const editorFrameEl = document.getElementById("yarn-frame");
window.addEventListener("yarnReady", e => {
  //give the yarn webb app the fs module
  yarn = e;
  yarn.app.fs = fs;
  ipcRenderer.send("yarn-ready");
});
editorFrameEl.src = "app/index.html";

// Called to load yarn data. Should be called after the window is fully loaded.
ipcRenderer.on("yarn-open", (event, receivedOptions) => {
  console.log("loaded a file");
});
