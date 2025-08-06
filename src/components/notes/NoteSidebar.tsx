import React, { useState, useRef } from "react";
import { Plus, Trash2, Pencil, MoreVertical, FilePlus, ChevronLeft, ChevronRight, Folder, FolderIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { FolderNode } from "../../types";
import { useGameUI } from "../GameUIProvider";
import { Tooltip } from "react-tooltip";

interface Props {
  tree: FolderNode[];
  onSelectNote: (folderId: string, noteId: string) => void;
  collapsed: boolean;
  onCollapse: () => void;
  selectedNoteId?: string;
  onAddNote?: (folderId: string) => void;
  onAddFolder?: (parentId?: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameNote?: (folderId: string, noteId: string, title: string) => void;
  onDeleteNote?: (folderId: string, noteId: string) => void;
}

export function NoteSidebar({
  tree,
  onSelectNote,
  selectedNoteId,
  collapsed,
  onCollapse,
  onAddNote,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameNote,
  onDeleteNote,
}: Props) {
  const { showToast, showConfirm, showAlert } = useGameUI?.() ?? {};
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 컨텍스트 메뉴 바깥 클릭 감지
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        menuOpenId &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpenId]);

  // 함수: 폴더/노트 추가·삭제·수정 등
  const handleAddFolder = (parentId?: string) => {
    onAddFolder?.(parentId);
    setMenuOpenId(null)
    showToast?.("새 폴더가 생성되었습니다!", "success");
  };
  const handleAddNote = (folderId: string) => {
    onAddNote?.(folderId);
    setMenuOpenId(null)
    showToast?.("새 노트가 추가되었습니다!", "success");
  };
  const handleRenameFolder = (folderId: string, name: string, origin: string) => {
    if (name.trim().length < 1) {
      showAlert?.({ message: "폴더명을 입력하세요." });
      return;
    }
    if (name !== origin) {
      onRenameFolder?.(folderId, name);
      setMenuOpenId(null)
      showToast?.("폴더명이 변경되었습니다.", "info");
    }
    setEditFolderId(null);
  };
  const handleRenameNote = (folderId: string, noteId: string, title: string, origin: string) => {
    if (title.trim().length < 1) {
      showAlert?.({ message: "노트명을 입력하세요." });
      return;
    }
    if (title !== origin) {
      onRenameNote?.(folderId, noteId, title);
      setMenuOpenId(null)
      showToast?.("노트명이 변경되었습니다.", "info");
    }
    setEditNoteId(null);
  };
  const handleDeleteFolder = async (folderId: string) => {
    const ok = await showConfirm?.("이 폴더와 모든 하위 항목을 삭제할까요?", "삭제", "취소");
    if (ok) {
      onDeleteFolder?.(folderId);
      setMenuOpenId(null)
      showToast?.("폴더가 삭제되었습니다!", "success");
    }
    setMenuOpenId(null);
  };
  const handleDeleteNote = async (folderId: string, noteId: string) => {
    const ok = await showConfirm?.("정말 이 노트를 삭제할까요?", "삭제", "취소");
    if (ok) {
      onDeleteNote?.(folderId, noteId);
      setMenuOpenId(null)
      showToast?.("노트가 삭제되었습니다!", "success");
    }
  };

  const renderTree = (node: FolderNode, depth = 0) => (
    <div
      key={node.id}
      className="mb-1 relative"
      style={collapsed ? undefined : { paddingLeft: `${depth * 16}px` }}
    >
      <div
        className={`flex items-center gap-1 font-bold text-indigo-700 py-1 group ${collapsed ? "justify-center" : ""} text-[13px]`}
      >
        {editFolderId === node.id ? (
          !collapsed && (
            <>
              <FolderIcon
                size={15}
                className="mr-1 text-indigo-400"
                data-tooltip-id={`folder-tt-${node.id}`}
                data-tooltip-content={node.name}
                style={{ minWidth: 16 }}
              />
              <Tooltip
                id={`folder-tt-${node.id}`}
                place="top"
                delayHide={500}
                
                style={{ zIndex: 9999, fontSize: 13, fontWeight: 600 }}
              />

              <input
                className="font-bold px-1 rounded border border-indigo-200 w-24 text-[13px]"
                autoFocus
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                onBlur={() => handleRenameFolder(node.id, editFolderName, node.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameFolder(node.id, editFolderName, node.name);
                  }
                }}
              />
            </>
          )
        ) : (
          <>
            {/* 폴더 아이콘에만 툴팁, 이름에도 툴팁 */}
            <FolderIcon
              size={15}
              className="mr-1 text-indigo-400"
              data-tooltip-id={`folder-tt-${node.id}`}
              data-tooltip-content={node.name}
              style={{ minWidth: 16 }}
            />
            <Tooltip id={`folder-tt-${node.id}`} place="top" />
            <span
              className={collapsed ? "hidden" : "truncate"}
              data-tooltip-id={!collapsed ? `folder-title-tt-${node.id}` : undefined}
              data-tooltip-content={!collapsed ? node.name : undefined}
            >
              {node.name}
            </span>
            {!collapsed && (
              <Tooltip id={`folder-title-tt-${node.id}`} place="top" />
            )}
            {!collapsed && (
              <button
                className="ml-1 rounded hover:bg-indigo-100 p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpenId((prev) => (prev === node.id ? null : node.id));
                }}
                tabIndex={-1}
                aria-label="더보기"
              >
                <MoreVertical size={16} />
              </button>
            )}
            <AnimatePresence>
              {menuOpenId === node.id && !collapsed && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.92, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ type: "spring", bounce: 0.5, duration: 0.17 }}
                  className="
                  absolute left-10 top-1 ml-1
                  z-50 min-w-[148px] bg-white border-2 border-indigo-200 shadow-xl rounded-xl py-2
                  flex flex-col font-semibold text-[13px]
                "
                  style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif" }}
                >
                  <button
                    className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-500"
                    onClick={() => {
                      setEditFolderId(node.id);
                      setEditFolderName(node.name);
                      setMenuOpenId(null);
                    }}
                  >
                    <Pencil size={14} /> 폴더명 수정
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-500"
                    onClick={() => handleAddFolder(node.id)}
                  >
                    <Plus size={14} /> 하위 폴더 추가
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-500"
                    onClick={() => handleAddNote(node.id)}
                  >
                    <FilePlus size={14} /> 새 노트 추가
                  </button>
                  <button
                    className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50"
                    onClick={() => handleDeleteFolder(node.id)}
                  >
                    <Trash2 size={14} /> 폴더 삭제
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
      {/* 노트 목록 */}
      {!collapsed &&
        node.notes?.map((note) =>
          editNoteId === note.id ? (
            <div key={note.id} className="flex pl-7 items-center gap-1 text-[13px]">
              <span className="mr-1">📓</span>
              <input
                className="px-1 rounded border border-indigo-100 w-20 text-[13px]"
                value={editNoteTitle}
                autoFocus
                onChange={(e) => setEditNoteTitle(e.target.value)}
                onBlur={() =>
                  handleRenameNote(node.id, note.id, editNoteTitle, note.title)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameNote(node.id, note.id, editNoteTitle, note.title);
                  }
                }}
              />
            </div>
          ) : (
            <div
              key={note.id}
              className={`pl-7 flex items-center gap-1 cursor-pointer rounded hover:bg-indigo-100 text-[13px] ${selectedNoteId === note.id ? "bg-indigo-200 font-extrabold" : ""
                }`}
            >
              <span
                className="mr-1"
                data-tooltip-id={`note-tt-${note.id}`}
                data-tooltip-content={note.title}
              >📓</span>
              <Tooltip id={`note-tt-${note.id}`} place="top" />
              <span
                className="truncate"
                data-tooltip-id={`note-title-tt-${note.id}`}
                data-tooltip-content={note.title}
                onClick={() => onSelectNote(node.id, note.id)}
              >
                {note.title}
              </span>
              <Tooltip id={`note-title-tt-${note.id}`} place="top" />
              <button
                className="text-xs px-1 rounded hover:bg-indigo-100"
                onClick={() => {
                  setEditNoteId(note.id);
                  setEditNoteTitle(note.title);
                }}
                title="노트명 수정"
              >
                <Pencil size={12} />
              </button>
              {onDeleteNote && (
                <button
                  className="text-xs text-red-400 hover:bg-red-100 px-1 rounded"
                  onClick={() => handleDeleteNote(node.id, note.id)}
                  title="노트 삭제"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        )}
      {/* 하위 폴더 */}
      {node.children?.map(child => renderTree(child, depth + 1))}
    </div>
  );



  // 🟡 collapsed에 따라 width와 헤더, 버튼 변화
  return (
    <aside
      className={`
        md:static top-0 left-0 z-30
        bg-white shadow-lg border-r flex flex-col p-4 gap-3
        transition-all duration-300
        ${collapsed ? "w-14" : "w-56"}
      `}
    >
      {/* 헤더: 폴더/접기/펼치기 */}
      <div className="flex items-center justify-between mb-3">
        {!collapsed && <span className="font-bold text-lg text-indigo-700">폴더</span>}
        <button onClick={onCollapse} className="p-1 rounded hover:bg-indigo-50">
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">{tree.map(renderTree)}</div>
      {/* collapsed 아닐 때만 + 새폴더 등 노출 */}
      {!collapsed && onAddFolder && (
        <button
          className="mt-2 py-1 px-3 bg-indigo-100 hover:bg-indigo-300 text-indigo-900 font-bold rounded shadow text-xs"
          onClick={() => onAddFolder(undefined)}
        >
          + 새 폴더
        </button>
      )}
    </aside>
  );
}