const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    frame: false, // 커스텀 타이틀바 사용
    titleBarStyle: "hidden", // Mac: 노치/테두리만
    title: "note"
  });

  // 개발환경과 배포환경 구분
  // if (process.env.NODE_ENV === "development") {
  win.loadURL("http://localhost:5173");
  // } else {
  //   win.loadFile(path.join(__dirname, '../dist/index.html'));
  // }
}


ipcMain.on('window-min', () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.on('window-max', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());


// IPC - 노트 저장 및 불러오기 예시 
const NOTE_PATH = path.join(__dirname, '..', 'db', 'notes.json');

// 데이터 읽기
function loadNotes() {  
  if (!fs.existsSync(NOTE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(NOTE_PATH, "utf-8"));
  } catch (e) {
    return [];
  }
}

// 데이터 저장
function saveNotes(data) {  
  fs.writeFileSync(NOTE_PATH, JSON.stringify(data, null, 2), "utf-8");
}



// IPC
ipcMain.handle("load-note", () => {
  return loadNotes();
});
ipcMain.handle("save-note", (_, data) => {
  saveNotes(data);
  return true;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
