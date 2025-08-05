const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveNote: (data) => ipcRenderer.invoke('save-note', data),
  loadNote: () => ipcRenderer.invoke('load-note'),
  windowMin: () => ipcRenderer.send('window-min'),
  windowMax: () => ipcRenderer.send('window-max'),
  windowClose: () => ipcRenderer.send('window-close'),
  saveImageFile: async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    // 파일 저장
    const filePath = await ipcRenderer.invoke("save-image-file", {
      name: file.name,
      buffer,
    });
    return { filePath }; // base64 반환하지 않음!
  },
  deleteImageFile: async (filePath) => {
    return await ipcRenderer.invoke("delete-image-file", filePath);
  },
  saveFlashcards: (data) => ipcRenderer.invoke('save-flashcards', data),
  loadFlashcards: () => ipcRenderer.invoke('load-flashcards'),
  loadEvents: () => ipcRenderer.invoke("load-events"),
  saveEvents: (data) => ipcRenderer.invoke("save-events", data),
});
