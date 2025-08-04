import React, { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import type { FolderNode } from "../../types";
import { useGameUI } from "../GameUIProvider"; // 커스텀 Context 사용!

interface Props {
  tree: FolderNode[];
  onSelectNote: (folderId: string, noteId: string) => void;
  selectedNoteId?: string;
  onAddNote?: (folderId: string) => void;
  onAddFolder?: (parentId?: string) => void;
  onRenameFolder?: (folderId: string, name: string) => void;
  onDeleteFolder?: (folderId: string) => void;
  onRenameNote?: (folderId: string, noteId: string, title: string) => void;
  onDeleteNote?: (folderId: string, noteId: string) => void;
  open: boolean;
  onClose: () => void;
}

export function NoteSidebar({
  tree,
  onSelectNote,
  selectedNoteId,
  onAddNote,
  onAddFolder,
  onRenameFolder,
  onDeleteFolder,
  onRenameNote,
  onDeleteNote,
  open,
  onClose,
}: Props) {
  const { showToast, showConfirm, showAlert } = useGameUI();

  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editNoteTitle, setEditNoteTitle] = useState("");

  // 추가/삭제/수정시 toast/alert 호출 예시
  const handleAddFolder = (parentId?: string) => {
    onAddFolder?.(parentId);
    showToast("새 폴더가 생성되었습니다!", "success");
  };
  const handleAddNote = (folderId: string) => {
    onAddNote?.(folderId);
    showToast("새 노트가 추가되었습니다!", "success");
  };

  const handleRenameFolder = (folderId: string, name: string, origin: string) => {
    if (name.trim().length < 1) {
      showAlert({ message: "폴더명을 입력하세요." });
      return;
    }
    if (name !== origin) {
      onRenameFolder?.(folderId, name);
      showToast("폴더명이 변경되었습니다.", "info");
    }
    setEditFolderId(null);
  };

  const handleRenameNote = (folderId: string, noteId: string, title: string, origin: string) => {
    if (title.trim().length < 1) {
      showAlert({ message: "노트명을 입력하세요." });
      return;
    }
    if (title !== origin) {
      onRenameNote?.(folderId, noteId, title);
      showToast("노트명이 변경되었습니다.", "info");
    }
    setEditNoteId(null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    const ok = await showConfirm("이 폴더와 모든 하위 항목을 삭제할까요?", "삭제", "취소");
    if (ok) {
      onDeleteFolder?.(folderId);
      showToast("폴더가 삭제되었습니다!", "success");
    }
  };

  const handleDeleteNote = async (folderId: string, noteId: string) => {
    const ok = await showConfirm("정말 이 노트를 삭제할까요?", "삭제", "취소");
    if (ok) {
      onDeleteNote?.(folderId, noteId);
      showToast("노트가 삭제되었습니다!", "success");
    }
  };

  const renderTree = (node: FolderNode) => (
    <div key={node.id} className="pl-2 mb-1">
      <div className="flex items-center gap-2 font-bold text-indigo-700 py-1">
        {editFolderId === node.id ? (
          <input
            className="font-bold px-1 rounded border border-indigo-200 w-28"
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
        ) : (
          <>
            <span>{node.name}</span>
            <button
              className="text-xs px-1 rounded hover:bg-indigo-100"
              onClick={() => {
                setEditFolderId(node.id);
                setEditFolderName(node.name);
              }}
              title="폴더명 수정"
            >
              <Pencil size={14} />
            </button>
          </>
        )}
        {onAddFolder && (
          <button
            className="text-xs bg-indigo-50 hover:bg-indigo-200 px-1 rounded"
            onClick={() => handleAddFolder(node.id)}
            title="하위 폴더 추가"
          >
            <Plus size={14} />
          </button>
        )}
        {onDeleteFolder && (
          <button
            className="text-xs text-red-400 hover:bg-red-100 px-1 rounded"
            onClick={() => handleDeleteFolder(node.id)}
            title="폴더 삭제"
          >
            <Trash2 size={14} />
          </button>
        )}
        {onAddNote && (
          <button
            className="text-xs bg-amber-50 hover:bg-amber-200 px-1 rounded"
            onClick={() => handleAddNote(node.id)}
            title="노트 추가"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
      {node.notes?.map((note) =>
        editNoteId === note.id ? (
          <div key={note.id} className="flex pl-4 items-center gap-1">
            <input
              className="px-1 rounded border border-indigo-100 w-20"
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
            className={`pl-4 flex items-center gap-1 cursor-pointer rounded hover:bg-indigo-100 ${
              selectedNoteId === note.id ? "bg-indigo-200 font-extrabold" : ""
            }`}
          >
            <span onClick={() => onSelectNote(node.id, note.id)}>
              📄 {note.title}
            </span>
            <button
              className="text-xs px-1 rounded hover:bg-indigo-100"
              onClick={() => {
                setEditNoteId(note.id);
                setEditNoteTitle(note.title);
              }}
              title="노트명 수정"
            >
              <Pencil size={14} />
            </button>
            {onDeleteNote && (
              <button
                className="text-xs text-red-400 hover:bg-red-100 px-1 rounded"
                onClick={() => handleDeleteNote(node.id, note.id)}
                title="노트 삭제"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )
      )}
      {node.children?.map(renderTree)}
    </div>
  );

  return (
    <aside
      className={`fixed md:static top-0 left-0 h-full z-30 w-56 bg-white shadow-lg border-r flex flex-col p-4 gap-3 transition-transform duration-300 ${
        open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
      style={{ minHeight: "100vh" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg text-indigo-700">폴더</span>
        <button className="md:hidden" onClick={onClose}>
          ✕
        </button>
      </div>
      <div>{tree.map(renderTree)}</div>
      {onAddFolder && (
        <button
          className="mt-2 py-1 px-3 bg-indigo-100 hover:bg-indigo-300 text-indigo-900 font-bold rounded shadow"
          onClick={() => handleAddFolder(undefined)}
        >
          + 새 폴더
        </button>
      )}
    </aside>
  );
}
