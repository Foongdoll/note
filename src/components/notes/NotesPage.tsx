// components/notes/NotesPage.tsx
import React, { useEffect, useState } from "react";
import { NoteSidebar } from "./NoteSidebar";
import MDEditor from "@uiw/react-md-editor";
import { motion, AnimatePresence } from "framer-motion";
import type { FolderNode, NoteMeta } from "../../types";

interface NotesPageProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export const NotesPage: React.FC<NotesPageProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.electronAPI?.loadNote?.().then((data) => {
      if (data) setTree(data);
    });
  }, []);

  // ...기존 findCurrentNote/handleSave/handleSelectNote/handleAddNote/handleAddFolder...

  const findCurrentNote = (): NoteMeta | null => {
    const find = (nodes: FolderNode[]): NoteMeta | null => {
      for (const node of nodes) {
        if (node.id === selectedFolderId && node.notes) {
          const note = node.notes.find((n) => n.id === selectedNoteId);
          if (note) return note;
        }
        if (node.children) {
          const found = find(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return selectedFolderId && selectedNoteId ? find(tree) : null;
  };

  const handleSave = (note: NoteMeta) => {
    const updateTree = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === selectedFolderId && node.notes) {
          return {
            ...node,
            notes: node.notes.map((n) =>
              n.id === selectedNoteId ? { ...n, ...note } : n
            ),
          };
        }
        if (node.children) {
          return { ...node, children: updateTree(node.children) };
        }
        return node;
      });
    const updated = updateTree(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 1000);
  };

  const handleSelectNote = (folderId: string, noteId: string) => {
    setSelectedFolderId(folderId);
    setSelectedNoteId(noteId);
  };

  const handleAddNote = (folderId: string) => {
    const newId = "note-" + Date.now();
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId) {
          return {
            ...node,
            notes: [
              ...(node.notes ?? []),
              { id: newId, title: "새 노트", content: "" },
            ],
          };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
    setSelectedFolderId(folderId);
    setSelectedNoteId(newId);
  };

  const handleAddFolder = (parentId?: string) => {
    const newId = "cat-" + Date.now();
    const update = (nodes: FolderNode[]): FolderNode[] => {
      if (!parentId) {
        return [
          ...nodes,
          { id: newId, name: "새 폴더", children: [], notes: [] },
        ];
      }
      return nodes.map((node) => {
        if (node.id === parentId) {
          return {
            ...node,
            children: [
              ...(node.children ?? []),
              { id: newId, name: "새 폴더", children: [], notes: [] },
            ],
          };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    };
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
  };

  // 폴더명 변경
  const handleRenameFolder = (folderId: string, name: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) =>
        node.id === folderId
          ? { ...node, name }
          : node.children
          ? { ...node, children: update(node.children) }
          : node
      );
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
  };

  // 폴더 삭제
  const handleDeleteFolder = (folderId: string) => {
    const remove = (nodes: FolderNode[]): FolderNode[] =>
      nodes
        .filter((node) => node.id !== folderId)
        .map((node) =>
          node.children ? { ...node, children: remove(node.children) } : node
        );
    const updated = remove(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
    // 선택 해제
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    if (currentNote && currentNote.id === selectedNoteId) setSelectedNoteId(null);
  };

  // 노트명 변경
  const handleRenameNote = (folderId: string, noteId: string, title: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.notes) {
          return {
            ...node,
            notes: node.notes.map((n) =>
              n.id === noteId ? { ...n, title } : n
            ),
          };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
  };

  // 노트 삭제
  const handleDeleteNote = (folderId: string, noteId: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.notes) {
          return {
            ...node,
            notes: node.notes.filter((n) => n.id !== noteId),
          };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveNote?.(updated);
    // 선택 해제
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  // 현재 노트 상태 관리
  const currentNote = findCurrentNote();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  useEffect(() => {
    setNoteTitle(currentNote?.title ?? "");
    setNoteContent(currentNote?.content ?? "");
  }, [selectedNoteId]);

  return (
    <div className="flex w-full h-full">
      <NoteSidebar
        open={sidebarOpen || window.innerWidth >= 768}
        onClose={() => setSidebarOpen(false)}
        tree={tree}
        onSelectNote={handleSelectNote}
        selectedNoteId={selectedNoteId ?? undefined}
        onAddNote={handleAddNote}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameNote={handleRenameNote}
        onDeleteNote={handleDeleteNote}
      />
      <div className="flex-1 flex flex-col gap-5 p-6">
        {currentNote ? (
          <motion.div
            className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-2"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
          >
            <input
              type="text"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="text-2xl font-extrabold mb-2 bg-transparent border-b border-indigo-200 focus:outline-none focus:border-indigo-500"
            />
            <div className="rounded-xl border border-indigo-100 bg-gray-50">
              <MDEditor
                value={noteContent}
                onChange={(v) => setNoteContent(v ?? "")}
                height={260}
                preview="edit"
                visiableDragbar={false}
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.07 }}
              className="self-end px-5 py-2 bg-indigo-600 text-white rounded-xl shadow font-bold mt-2"
              onClick={() => handleSave({ id: currentNote.id, title: noteTitle, content: noteContent })}
            >
              저장
            </motion.button>
            <AnimatePresence>
              {saved && (
                <motion.div
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -30 }}
                  exit={{ opacity: 0 }}
                  className="absolute top-2 right-8 bg-green-400 text-white rounded-lg shadow-lg px-4 py-2"
                >
                  저장됨!
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="text-gray-400 text-center py-20">노트를 선택하세요!</div>
        )} 
      </div>
    </div>
  );
};
