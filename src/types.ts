import "react";

export interface NoteMeta {
  id: string;
  title: string;
  content?: string;      // (메타/본문 분리 이후엔 선택)
  contentPath?: string;  // ✅ 추가: 본문 파일 경로
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
  /** 노트 트리(메타: 폴더/제목/선택적 contentPath) */
  loadNoteTree: () => Promise<FolderNode[]>;
  saveNoteTree: (data: FolderNode[]) => Promise<boolean>;

  /** 특정 노트 본문(.md) — 지연 로딩/저장 */
  loadNoteContent: (args: { noteId: string; contentPath?: string }) => Promise<string>;
  saveNoteContent: (args: { noteId: string; content: string; contentPath?: string }) => Promise<{ contentPath: string }>;

  // 창 제어
  windowMin: () => void;
  windowMax: () => void;
  windowClose: () => void;

  // 이미지 파일
  saveImageFile: (file: File) => Promise<{ filePath: string }>;
  deleteImageFile: (filePath: string) => Promise<boolean>;

  // 플래시카드
  saveFlashcards: (data: FlashcardNode[]) => Promise<boolean>;
  loadFlashcards: () => Promise<FlashcardNode[]>;

  // 캘린더
  loadEvents: () => Promise<CalendarEvent[]>;
  saveEvents: (data: CalendarEvent[]) => Promise<boolean>;

  // (옵션) userData 루트
  getDataSavePath?: () => Promise<string>;

  /** @deprecated 메타/본문 분리 이전 API. 점진적 이전용(있으면 남겨두고, 전역 검색 후 제거 권장) */
  saveNote?: (data: FolderNode[]) => Promise<boolean>;
  loadNote?: () => Promise<FolderNode[]>;
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