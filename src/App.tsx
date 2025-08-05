import React, { useState } from "react";
import { motion } from "framer-motion";
import { NotebookPen, Layers, CalendarCheck, Menu } from "lucide-react";
import { NotesPage } from "./components/notes/NotesPage.tsx";
import { EmptySidebar } from "./components/EmptySidebar.tsx";
import { FlashcardsPage } from "./components/flashcard/FlashcardPage.tsx";
import { CalendarPage } from "./components/calendar/CalendarPage.tsx";

// ---------- 커스텀 타이틀바 ----------
function CustomTitleBar() {
  return (
    <div
      className="w-full h-9 flex items-center px-3 justify-between bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-700 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
    >
      <span className="font-extrabold text-white tracking-wide">📝 Note</span>
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
        <button
          className="w-7 h-7 rounded hover:bg-white/20 flex items-center justify-center"
          onClick={() => window.electronAPI?.windowMin?.()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect y="7" width="16" height="2" fill="white" />
          </svg>
        </button>
        <button
          className="w-7 h-7 rounded hover:bg-white/20 flex items-center justify-center"
          onClick={() => window.electronAPI?.windowMax?.()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <rect x="3" y="3" width="10" height="10" rx="2" fill="white" />
          </svg>
        </button>
        <button
          className="w-7 h-7 rounded hover:bg-red-400/70 flex items-center justify-center"
          onClick={() => window.electronAPI?.windowClose?.()}
        >
          <svg width="16" height="16" viewBox="0 0 16 16">
            <line x1="4" y1="4" x2="12" y2="12" stroke="white" strokeWidth="2" />
            <line x1="12" y1="4" x2="4" y2="12" stroke="white" strokeWidth="2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------- 네비게이션 탭 ----------
const NAV = [
  { key: "notes", label: "노트", icon: <NotebookPen size={20} /> },
  { key: "flashcards", label: "플래시카드", icon: <Layers size={20} /> },
  { key: "calendar", label: "캘린더", icon: <CalendarCheck size={20} /> },
];

function NavBar({ tab, setTab }: { tab: string; setTab: (t: string) => void }) {
  return (
    <nav className="flex gap-2 items-center px-6 py-2 bg-white/80 border-b">
      {NAV.map((item) => (
        <motion.button
          key={item.key}
          whileTap={{ scale: 0.95 }}
          whileHover={{ y: -3, scale: 1.1 }}
          className={`px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors ${tab === item.key
              ? "bg-indigo-100 text-indigo-600 shadow"
              : "hover:bg-gray-50"
            }`}
          onClick={() => setTab(item.key)}
        >
          {item.icon}
          {item.label}
        </motion.button>
      ))}
    </nav>
  );
}

// ---------- 헤더 ----------
function PageHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-white/70 border-b font-extrabold text-xl">
      <span>{title}</span>
    </div>
  );
}

// ---------- App 전체 ----------
export default function App() {
  const [tab, setTab] = useState("notes");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 메뉴별 Sidebar/MainContent 분기
  let MainContent: React.ReactNode = null;
  let Sidebar: React.ReactNode = null;
  let pageTitle = "";

  if (tab === "notes") {
    MainContent = <NotesPage />;
    Sidebar = null; // NotesPage 내부에서 NoteSidebar 직접 렌더
    pageTitle = "노트";
  } else if (tab === "flashcards") {
    MainContent = <FlashcardsPage sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
    Sidebar = null; // FlashcardsPage 내부에서 FlashcardSidebar 직접 렌더
    pageTitle = "플래시카드";
  } else if (tab === "calendar") {
    MainContent = <CalendarPage/>;
    Sidebar = <></>;
    pageTitle = "캘린더";
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-tr from-[#f3f3fa] to-[#e9eaff]">
      {/* 커스텀 타이틀바 */}
      <CustomTitleBar />
      {/* 상단 네비 */}
      <NavBar tab={tab} setTab={setTab} />
      <div className="flex-1 flex w-full h-full relative overflow-hidden">
        {/* 모바일/작은 화면용 사이드바 토글 */}
        {/* 메뉴별 Sidebar (Notes는 NotesPage에서 자체 렌더) */}
        {Sidebar}
        {/* 메인 컨텐츠 */}
        <main className="flex-1 flex flex-col min-w-0 overflow-x-auto bg-white/70 rounded-2xl shadow-md m-5 mt-2">
          <PageHeader title={pageTitle} />
          <div className="flex-1 overflow-y-auto">{MainContent}</div>
        </main>
      </div>
    </div>
  );
}
