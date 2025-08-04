// types.ts
export interface NoteMeta {
  id: string;
  title: string;
  content: string;
}
export interface FolderNode {
  id: string;
  name: string;
  children?: FolderNode[];
  notes?: NoteMeta[];
}

export interface ElectronAPI {
  saveNote: (data: any) => Promise<any>;
  loadNote: () => Promise<any>;
  windowMin: () => void;
  windowMax: () => void;
  windowClose: () => void;
}

// 전역 window에 등록
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}