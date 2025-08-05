import "react";

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

export interface FlashcardNode {
  id: string;
  name: string;
  children?: FlashcardNode[];
  cards?: Flashcard[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
}

export interface ElectronAPI {
  saveNote: (data: any) => Promise<void>;
  loadNote: () => Promise<any>;
  windowMin: () => void;
  windowMax: () => void;
  windowClose: () => void;
  saveImageFile?: (file: File) => Promise<{ filePath: string }>;
  deleteImageFile?: (filePath: string) => Promise<boolean>;
  saveFlashcards: (data: FlashcardNode[]) => Promise<void>;
  loadFlashcards: () => Promise<FlashcardNode[]>;
  loadEvents: () => Promise<CalendarEvent[]>;
  saveEvents: (data: CalendarEvent[]) => Promise<boolean>;
}

export type ScheduleType = "기념일" | "시험" | "약속" | "공부" | "일정";

export interface CalendarEvent {
  id: string;
  type: ScheduleType;
  title: string;
  description: string;
  participants: string;
  start: string;   // ISO
  end: string;     // ISO
  items: string;   // 준비물
  place: string;
  note: string;    // 비고
  important?: boolean;
}

// 이 선언을 한 번만 추가!
declare module "react" {
  interface CSSProperties {
    WebkitAppRegion?: "drag" | "no-drag";
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}