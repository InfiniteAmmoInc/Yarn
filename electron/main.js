const electron = require("electron");
const ipcMain = electron.ipcMain;
const { dialog } = electron;
const isDev = require("electron-is").dev();
// const fs = require("fs");
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let yarnRunnerWindow;
let yarnVersion = "0.4.1";
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    maximize: false,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.setMenu(null);
  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/yarn-index.html`);

  // if (isDev) {
  //   mainWindow.loadURL(`http://localhost:8080`);
  // }
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("close", function(event) {
    mainWindow.webContents.send("appIsClosing", event);

    event.preventDefault();
    if (yarnRunnerWindow) {
      yarnRunnerWindow.destroy();
    }
    mainWindow.destroy();
    mainWindow = null;
  });

  mainWindow.webContents.on("dom-ready", () => {
    // in case you want to send data to yarn window on init
    // if(yarnData){
    //   mainWindow.webContents.send('loadYarnDataObject', yarnData)
    // };
    // console.log(mainWindow.webContents);
    // mainWindow.yarn.app.fs = fs;
    mainWindow.webContents.send("initiate", yarnVersion);
    mainWindow.show();
    mainWindow.maximize();
  });

  ipcMain.on("openFile", (event, operation) => {
    dialog.showOpenDialog(
      {
        properties: ["openFile"]
      },
      function(files) {
        if (files)
          mainWindow.webContents.send("selected-file", files[0], operation);
      }
    );
  });

  ipcMain.on("saveFileYarn", (event, type, content) => {
    dialog.showSaveDialog(
      mainWindow,
      { filters: [{ name: "story", extensions: [type] }] },
      function(filepath) {
        mainWindow.webContents.send("saved-file", filepath, type, content);
      }
    );
  });

  ipcMain.on("sendYarnDataToObject", (event, content, startTestNode) => {
    // in case you wannt to export yarn object to another embedded app
    otherApp.webContents.send("yarnSavedStory", content);
    mainWindow.close();
  });

  ipcMain.on(
    "testYarnStoryFrom",
    (event, content, startTestNode, resourcesPath) => {
      createYarnTesterWindow(content, startTestNode, resourcesPath);
    }
  );
}

function createYarnTesterWindow(content, startTestNode, resourcesPath) {
  // console.log("START RUN::"+startTestNode);
  if (yarnRunnerWindow) {
    yarnRunnerWindow.destroy();
  }
  yarnRunnerWindow = new BrowserWindow({
    defaultWidth: 1400,
    defaultHeight: 200,
    maximize: false,
    show: false,
    autoHideMenuBar: true
  });

  yarnRunnerWindow.loadURL(`file://${__dirname}/app/renderer.html`);
  if (isDev) {
    yarnRunnerWindow.webContents.openDevTools();
  }

  yarnRunnerWindow.webContents.on("dom-ready", () => {
    yarnRunnerWindow.webContents.send(
      "loadYarnDataOnRunner",
      content,
      startTestNode,
      resourcesPath
    );
    yarnRunnerWindow.show();
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
