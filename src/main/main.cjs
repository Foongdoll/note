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
    frame: false, // 커스텀 타이틀바 사용
    titleBarStyle: "hidden", // Mac: 노치/테두리만
    title: "note",
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


// 노트 저장 경로
const NOTE_PATH = path.join(__dirname, 'noteApp', 'notes.json');
// 플래시카드 저장 경로
const FLASHCARD_PATH = path.join(__dirname, 'noteApp', "flashcards.json");
// 캘린더 저장 경로
const CALENDAR_PATH = path.join(__dirname, 'noteApp', "calendar.json");

const IMAGE_SAVE_PATH = path.join(__dirname, 'noteApp', "images");

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

// 파일 저장 핸들러
ipcMain.handle("save-image-file", async (event, { name, buffer }) => {  
  // 디렉토리도 비동기/재귀로 생성
  if (!fs.existsSync(IMAGE_SAVE_PATH)) await fs.promises.mkdir(IMAGE_SAVE_PATH, { recursive: true });
  const savePath = path.join(IMAGE_SAVE_PATH, Date.now() + "_" + name);
  await fs.promises.writeFile(savePath, buffer);
  return savePath;
});

// 파일 삭제 핸들러
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



// 일정 파일 읽기 (없으면 빈 배열 반환)
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

// 일정 파일 저장
function writeCalendar(data) {
  try {
    if (!fs.existsSync(CALENDAR_DIR)) fs.mkdirSync(CALENDAR_DIR, { recursive: true });
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
