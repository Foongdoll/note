// preload.js (CommonJS)
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // ---- 노트 트리(메타) ----
  loadNoteTree: () => ipcRenderer.invoke('load-note-tree'),
  saveNoteTree: (data) => ipcRenderer.invoke('save-note-tree', data),

  // ---- 특정 노트 본문(.md) ----
  loadNoteContent: ({ noteId, contentPath } = {}) =>
    ipcRenderer.invoke('load-note-content', { noteId, contentPath }),
  saveNoteContent: ({ noteId, content, contentPath } = {}) =>
    ipcRenderer.invoke('save-note-content', { noteId, content, contentPath }),

  // ---- 창 제어 ----
  windowMin: () => ipcRenderer.send('window-min'),
  windowMax: () => ipcRenderer.send('window-max'),
  windowClose: () => ipcRenderer.send('window-close'),

  // ---- 이미지 파일 저장/삭제 ----
  saveImageFile: async (file) => {    
    // Electron의 File/Blob에는 path가 있을 수 있음 (특히 drop/클립보드)
    const anyFile = file;
    if (anyFile && anyFile.path) {
      const saved = await ipcRenderer.invoke("save-image-file", {
        filePath: anyFile.path,
        name: anyFile.name || "image",
      });
      return { filePath: saved };
    }

    // path가 없으면 버퍼 방식
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const saved = await ipcRenderer.invoke("save-image-file", {
      name: file.name || "image",
      buffer,
    });
    return { filePath: saved };
  },
  deleteImageFile: (filePath) => ipcRenderer.invoke('delete-image-file', filePath),

  // ---- 플래시카드 ----
  saveFlashcards: (data) => ipcRenderer.invoke('save-flashcards', data),
  loadFlashcards: () => ipcRenderer.invoke('load-flashcards'),

  // ---- 캘린더 ----
  loadEvents: () => ipcRenderer.invoke('load-events'),
  saveEvents: (data) => ipcRenderer.invoke('save-events', data),

  // ---- (옵션) userData 루트 ----
  getDataSavePath: () => ipcRenderer.invoke('getDataSavePath'),
});
