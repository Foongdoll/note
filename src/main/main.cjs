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
      webSecurity: false
    },
    frame: false,
    titleBarStyle: "hidden",
    title: "note",
  });

  // win.loadURL("http://localhost:5173");
  win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

// 윈도우 창 제어 IPC
ipcMain.on('window-min', () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.on('window-max', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());

// 저장 경로 정의
const DATA_DIR = path.join(app.getPath("userData"), 'noteApp');
const NOTE_PATH = path.join(DATA_DIR, 'notes.json');
const FLASHCARD_PATH = path.join(DATA_DIR, "flashcards.json");
const CALENDAR_PATH = path.join(DATA_DIR, "calendar.json");
const IMAGE_SAVE_PATH = path.join(DATA_DIR, "images");

// 디렉토리 생성 유틸
function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 노트 데이터 읽기
function loadNotes() {
  if (!fs.existsSync(NOTE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(NOTE_PATH, "utf-8"));
  } catch (e) {
    return [];
  }
}

// 노트 데이터 저장
function saveNotes(data) {
  ensureDirExists(NOTE_PATH);
  fs.writeFileSync(NOTE_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// 노트 IPC
ipcMain.handle("load-note", () => {
  return loadNotes();
});
ipcMain.handle("save-note", (_, data) => {
  saveNotes(data);
  return true;
});

// 이미지 파일 저장 핸들러
ipcMain.handle("save-image-file", async (event, { name, buffer }) => {
  if (!fs.existsSync(IMAGE_SAVE_PATH)) await fs.promises.mkdir(IMAGE_SAVE_PATH, { recursive: true });
  const savePath = path.join(IMAGE_SAVE_PATH, Date.now() + "_" + name);
  await fs.promises.writeFile(savePath, buffer);
  return savePath;
});

// 이미지 파일 삭제 핸들러
ipcMain.handle("delete-image-file", async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error("이미지 파일 삭제 실패:", err);
    return false;
  }
});

// 플래시카드 저장
ipcMain.handle("save-flashcards", async (event, data) => {
  try {
    ensureDirExists(FLASHCARD_PATH);
    fs.writeFileSync(FLASHCARD_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("플래시카드 저장 오류:", e);
    throw e;
  }
});

// 플래시카드 불러오기
ipcMain.handle("load-flashcards", async () => {
  try {
    if (!fs.existsSync(FLASHCARD_PATH)) return [];
    const json = fs.readFileSync(FLASHCARD_PATH, "utf-8");
    return JSON.parse(json);
  } catch (e) {
    console.error("플래시카드 불러오기 오류:", e);
    return [];
  }
});

// 캘린더 파일 읽기 (없으면 빈 배열 반환)
function readCalendar() {
  try {
    if (!fs.existsSync(CALENDAR_PATH)) return [];
    const data = fs.readFileSync(CALENDAR_PATH, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    console.error("캘린더 파일 읽기 실패", e);
    return [];
  }
}

// 캘린더 파일 저장
function writeCalendar(data) {
  try {
    ensureDirExists(CALENDAR_PATH);
    fs.writeFileSync(CALENDAR_PATH, JSON.stringify(data, null, 2), "utf-8");
    return true;
  } catch (e) {
    console.error("캘린더 파일 저장 실패", e);
    return false;
  }
}

// ----- IPC 핸들러 등록 -----
ipcMain.handle("load-events", async () => {
  return readCalendar();
});

ipcMain.handle("save-events", async (event, data) => {
  return writeCalendar(data);
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
