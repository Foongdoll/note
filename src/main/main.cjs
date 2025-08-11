'use strict';

/**
 * main.cjs — Electron (CommonJS)
 * - notes.json(레거시) → notes-meta.json + notes/{id}.md 로 자동 마이그레이션
 * - 메타(트리/제목)와 본문(.md)을 분리하여 대용량 content로 인한 버벅임 제거
 * - 모든 파일 I/O를 비동기(fs.promises)로 통일
 */

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const { URL } = require('url');

// -------------------- 경로 --------------------
const DATA_DIR = path.join(app.getPath('userData'), 'noteApp');
const META_PATH = path.join(DATA_DIR, 'notes-meta.json');   // 트리/제목
const NOTE_LEGACY_PATH = path.join(DATA_DIR, 'notes.json');        // 레거시(본문 포함)
const NOTES_DIR = path.join(DATA_DIR, 'notes');             // 본문 .md
const FLASHCARD_PATH = path.join(DATA_DIR, 'flashcards.json');
const CALENDAR_PATH = path.join(DATA_DIR, 'calendar.json');
const IMAGE_SAVE_PATH = path.join(DATA_DIR, 'images');

// -------------------- 유틸 --------------------
function ensureDir(targetPath) {
  const dir = path.extname(targetPath) ? path.dirname(targetPath) : targetPath;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// 오래된 Users 경로를 현재 기기의 userData/noteApp/images 로 치환
function rewriteImagePaths(content) {
  if (typeof content !== 'string') return content;
  const currentImagesDir = path.join(DATA_DIR, 'images').replace(/\\/g, '/');
  return content.replace(
    /!\[([^\]]*)\]\((?:file:\/\/\/)?[A-Za-z]:\/Users\/[^/]+\/AppData\/Roaming\/note\/noteApp\/images\/([^)\s]+)\)/g,
    (_m, alt, filePart) => `![${alt}](file:///${currentImagesDir}/${filePart})`
  );
}

// -------------------- 마이그레이션 --------------------
async function migrateIfNeeded() {
  try {
    // 이미 신형이면 스킵
    if (fs.existsSync(META_PATH)) return;
    // 레거시 파일 없으면 스킵
    if (!fs.existsSync(NOTE_LEGACY_PATH)) return;

    const raw = await fsp.readFile(NOTE_LEGACY_PATH, 'utf-8');
    const legacyTree = JSON.parse(raw);
    ensureDir(NOTES_DIR);

    const walk = async (nodes) => {
      const out = [];
      for (const node of nodes) {
        const newNode = { ...node };

        if (Array.isArray(node.notes)) {
          const newNotes = [];
          for (const note of node.notes) {
            const id = note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const mdPathRel = `notes/${id}.md`;
            const mdAbs = path.join(DATA_DIR, mdPathRel);

            await fsp.writeFile(mdAbs, (note.content ?? ''), 'utf-8'); // 본문 저장
            const { content, ...rest } = note;
            newNotes.push({ ...rest, id, contentPath: mdPathRel });     // 메타에 contentPath만 남김
          }
          newNode.notes = newNotes;
        }

        if (Array.isArray(node.children) && node.children.length) {
          newNode.children = await walk(node.children);
        }
        out.push(newNode);
      }
      return out;
    };

    const metaTree = await walk(legacyTree);
    ensureDir(META_PATH);
    await fsp.writeFile(META_PATH, JSON.stringify(metaTree, null, 2), 'utf-8');

    // 원하면 레거시 파일 삭제 가능:
    // await fsp.unlink(NOTE_LEGACY_PATH);

    console.log('✅ Migrated: notes.json → notes-meta.json + notes/*.md');
  } catch (e) {
    console.error('마이그레이션 실패:', e);
  }
}

// -------------------- 메타 로드/저장 --------------------
async function loadMeta() {
  try {
    if (!fs.existsSync(META_PATH)) return [];
    const json = await fsp.readFile(META_PATH, 'utf-8');
    return JSON.parse(json);
  } catch (e) {
    console.error('메타 로드 오류:', e);
    return [];
  }
}
async function saveMeta(data) {
  try {
    ensureDir(META_PATH);
    await fsp.writeFile(META_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('메타 저장 오류:', e);
    return false;
  }
}

// -------------------- 본문 로드/저장 --------------------
async function loadNoteContent(noteId, contentPath) {
  try {
    const rel = contentPath || `notes/${noteId}.md`;
    const abs = path.join(DATA_DIR, rel);
    if (!fs.existsSync(abs)) return '';
    const txt = await fsp.readFile(abs, 'utf-8');
    return rewriteImagePaths(txt);
  } catch (e) {
    console.error('본문 로드 오류:', e);
    return '';
  }
}
async function saveNoteContent(noteId, content, contentPath) {
  try {
    const rel = contentPath || `notes/${noteId}.md`;
    const abs = path.join(DATA_DIR, rel);
    ensureDir(abs);
    await fsp.writeFile(abs, (content ?? ''), 'utf-8');
    return rel;
  } catch (e) {
    console.error('본문 저장 오류:', e);
    throw e;
  }
}

// -------------------- BrowserWindow --------------------
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minHeight: 550,
    minWidth: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
    frame: false,
    titleBarStyle: 'hidden',
    title: 'note',
  });

  // 개발용
  // win.loadURL('http://localhost:5173');
  // 배포용
  win.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
}

// -------------------- IPC --------------------
ipcMain.on('window-min', () => BrowserWindow.getFocusedWindow()?.minimize());
ipcMain.on('window-max', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win?.isMaximized()) win.unmaximize();
  else win?.maximize();
});
ipcMain.on('window-close', () => BrowserWindow.getFocusedWindow()?.close());

// 앱 준비 시 마이그레이션 후 창 생성
app.whenReady().then(async () => {
  await migrateIfNeeded();
  createWindow();

  // periodic cleanup every 6 hours
  setInterval(() => {
    cleanupUnusedImages().then((r) => {
      console.log(`🧹 image cleanup: deleted=${r.deleted}/${r.total}`);
    }).catch(() => { });
  }, 6 * 60 * 60 * 1000);
});

// 메타(트리/제목)
ipcMain.handle('load-note-tree', async () => {
  return await loadMeta();
});
ipcMain.handle('save-note-tree', async (_e, data) => {
  return await saveMeta(data);
});

// 특정 노트 본문 (지연 로딩/저장)
ipcMain.handle('load-note-content', async (_e, { noteId, contentPath }) => {
  return await loadNoteContent(noteId, contentPath);
});
ipcMain.handle('save-note-content', async (_e, { noteId, content, contentPath }) => {
  const rel = await saveNoteContent(noteId, content, contentPath);
  return { contentPath: rel };
});

// userData 루트
ipcMain.handle('getDataSavePath', () => app.getPath('userData'));

ipcMain.handle("save-image-file", async (_event, payload) => {
  try {
    if (!fs.existsSync(IMAGE_SAVE_PATH)) {
      await fs.promises.mkdir(IMAGE_SAVE_PATH, { recursive: true });
    }

    // 1) 파일 경로가 오면 복사
    if (payload?.filePath) {
      const src = payload.filePath;                 // 드롭/클립보드에서 받은 원본 경로
      const base = payload.name || path.basename(src);
      const savePath = path.join(IMAGE_SAVE_PATH, `${Date.now()}_${base}`);
      await fs.promises.copyFile(src, savePath);
      return savePath;
    }

    // 2) 버퍼가 오면 쓰기 (개발환경/특정 케이스)
    if (payload?.buffer && payload?.name) {
      const savePath = path.join(IMAGE_SAVE_PATH, `${Date.now()}_${payload.name}`);
      await fs.promises.writeFile(savePath, payload.buffer);
      return savePath;
    }

    throw new Error("Invalid payload for save-image-file");
  } catch (err) {
    console.error("save-image-file failed:", err);
    throw err;
  }
});


ipcMain.handle('delete-image-file', async (_event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      await fsp.unlink(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error('이미지 파일 삭제 실패:', err);
    return false;
  }
});

// 플래시카드
ipcMain.handle('save-flashcards', async (_e, data) => {
  try {
    ensureDir(FLASHCARD_PATH);
    await fsp.writeFile(FLASHCARD_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('플래시카드 저장 오류:', e);
    throw e;
  }
});
ipcMain.handle('load-flashcards', async () => {
  try {
    if (!fs.existsSync(FLASHCARD_PATH)) return [];
    const json = await fsp.readFile(FLASHCARD_PATH, 'utf-8');
    return JSON.parse(json);
  } catch (e) {
    console.error('플래시카드 불러오기 오류:', e);
    return [];
  }
});

// 캘린더 (비동기)
ipcMain.handle('load-events', async () => {
  try {
    if (!fs.existsSync(CALENDAR_PATH)) return [];
    const data = await fsp.readFile(CALENDAR_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    console.error('캘린더 파일 읽기 실패', e);
    return [];
  }
});
ipcMain.handle('save-events', async (_e, data) => {
  try {
    ensureDir(CALENDAR_PATH);
    await fsp.writeFile(CALENDAR_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('캘린더 파일 저장 실패', e);
    return false;
  }
});


// ---------- Unused image cleanup ----------
async function readAllMarkdownFiles(dirAbs) {
  const out = [];
  async function walkDir(abs) {
    const entries = await fsp.readdir(abs, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) {
        await walkDir(full);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.md')) {
        out.push(full);
      }
    }
  }
  if (fs.existsSync(dirAbs)) await walkDir(dirAbs);
  return out;
}

function extractMdImageUrls(mdText) {
  // ![alt](URL)   — very permissive capture
  const re = /!\[[^\]]*\]\(([^)\s]+)\)/g;
  const urls = [];
  let m;
  while ((m = re.exec(mdText)) !== null) {
    urls.push(m[1]);
  }
  return urls;
}

// Convert URL-ish to absolute file path (only keep images in IMAGE_SAVE_PATH)
function normalizeImageToAbs(urlStr) {
  try {
    // appdata:// scheme not used now; keep example if you adopt it later.
    if (urlStr.startsWith('file:///')) {
      // file:///C:/... on Windows
      const decoded = decodeURI(urlStr.replace(/^file:\/\/\//, ''));
      // Turn forward slashes into platform path
      return path.normalize(decoded);
    }
    // Handle raw Windows absolute paths like C:\...
    if (/^[A-Za-z]:\\/.test(urlStr) || /^[A-Za-z]:\//.test(urlStr)) {
      return path.normalize(urlStr.replace(/\//g, path.sep));
    }
  } catch { /* ignore */ }
  return null;
}

async function collectUsedImageAbsPaths() {
  const used = new Set();
  const mdFiles = await readAllMarkdownFiles(NOTES_DIR);
  for (const md of mdFiles) {
    try {
      const txt = await fsp.readFile(md, 'utf-8');
      const urls = extractMdImageUrls(txt);
      for (const u of urls) {
        const abs = normalizeImageToAbs(u);
        if (!abs) continue;
        // only consider files inside IMAGE_SAVE_PATH
        // normalize casing on Windows
        const normAbs = path.normalize(abs);
        const imgRoot = path.normalize(IMAGE_SAVE_PATH);
        if (normAbs.startsWith(imgRoot)) {
          used.add(normAbs);
        }
      }
    } catch (e) {
      console.warn('read md failed:', md, e?.message);
    }
  }
  return used;
}

async function listAllImageFiles() {
  const result = [];
  async function walkDir(abs) {
    if (!fs.existsSync(abs)) return;
    const ents = await fsp.readdir(abs, { withFileTypes: true });
    for (const ent of ents) {
      const full = path.join(abs, ent.name);
      if (ent.isDirectory()) await walkDir(full);
      else if (ent.isFile()) result.push(full);
    }
  }
  await walkDir(IMAGE_SAVE_PATH);
  return result;
}

async function cleanupUnusedImages() {
  try {
    const used = await collectUsedImageAbsPaths();
    const all = await listAllImageFiles();

    const toDelete = all.filter((p) => !used.has(path.normalize(p)));
    for (const p of toDelete) {
      try { await fsp.unlink(p); } catch (e) { console.warn('unlink failed:', p, e?.message); }
    }

    return {
      total: all.length,
      used: used.size,
      deleted: toDelete.length,
      deletedPaths: toDelete,
    };
  } catch (e) {
    console.error('cleanupUnusedImages failed:', e);
    return { total: 0, used: 0, deleted: 0, deletedPaths: [], error: String(e) };
  }
}


// macOS 규약
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
