// This file serves as e middle layer to communicate between the web app and electron's native features
const electron = require("electron");
const ipcRenderer = electron.ipcRenderer;
const fs = require("fs");
const yarnWindow = electron.remote.getCurrentWindow();
let yarn = null;

const editorFrameEl = document.getElementById("yarn-frame");
window.addEventListener("yarnReady", e => {
  //give the yarn webb app the fs module, so we can ctrl+s in electron without pop ups
  yarn = e;
  yarn.app.fs = fs;
  ipcRenderer.send("yarn-ready");
});
editorFrameEl.src = "app/index.html";

// Called on load yarn data.
window.addEventListener("yarnLoadedData", e => {
  yarnWindow.setTitle(e.data.editingPath());
});
