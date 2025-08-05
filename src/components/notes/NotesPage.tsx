import React, { useEffect, useRef, useState } from "react";
import { NoteSidebar } from "./NoteSidebar";
import MDEditor from "@uiw/react-md-editor";
import { motion, AnimatePresence } from "framer-motion";
import type { FolderNode, NoteMeta } from "../../types";
import remarkBreaks from "remark-breaks";


export const NotesPage: React.FC = () => {
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 새 이미지 업로드시 경로 임시 저장
  const [pendingImages, setPendingImages] = useState<string[]>([]);

  // 이미지 업로드 관련
  const mdEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.electronAPI?.loadNote?.().then((data) => {
      if (data) setTree(data);
    });
  }, []);

  // 노트 찾기
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


  // 노트 저장  
  const handleSave = async (note: NoteMeta) => {
    try {
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
      await window.electronAPI?.saveNote?.(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1000);
      // 저장 성공 시, pendingImages 초기화 (성공한 이미지는 유지)
      setPendingImages([]);
    } catch (err) {
      // 저장 실패시 → 업로드된 이미지 삭제!
      for (const filePath of pendingImages) {
        await window.electronAPI?.deleteImageFile?.(filePath);
      }
      setPendingImages([]);
      alert("노트 저장에 실패했습니다. 업로드된 이미지는 삭제되었습니다.");
    }
  };

  // 노트/폴더 관리 함수들
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
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    if (findCurrentNote()?.id === selectedNoteId) setSelectedNoteId(null);
  };
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
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  // 현재 노트 상태 관리
  const currentNote = findCurrentNote();
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!currentNote) return;

    // 기존 타이머 있으면 취소
    if (autoSaveTimer) clearTimeout(autoSaveTimer);

    // 타이핑 멈춘 뒤 1초 후 저장
    const timer = setTimeout(() => {
      // 제목이나 내용이 실제로 바뀐 경우에만 저장
      if (noteTitle !== currentNote.title || noteContent !== currentNote.content) {
        handleSave({ id: currentNote.id, title: noteTitle, content: noteContent });
      }
    }, 1000);

    setAutoSaveTimer(timer);

    // 언마운트 시 타이머 클리어
    return () => clearTimeout(timer);    
  }, [noteTitle, noteContent]);


  useEffect(() => {
    setNoteTitle(currentNote?.title ?? "");
    setNoteContent(currentNote?.content ?? "");
  }, [selectedNoteId, currentNote]);

  // ----- 📎 파일 업로드 지원 -----
  useEffect(() => {
    if (!mdEditorRef.current) return;
    const editor = mdEditorRef.current;

    // 이미지 파일 드롭/붙여넣기 시 자동 업로드 및 마크다운 입력
    const onDropOrPaste = async (e: any) => {
      let files = null;
      if ("clipboardData" in e && e.clipboardData?.files?.length) {
        files = e.clipboardData.files;
      } else if ("dataTransfer" in e && e.dataTransfer?.files?.length) {
        files = e.dataTransfer.files;
      }
      if (files && files.length > 0) {
        e.preventDefault();
        const file = files[0];
        if (!file.type.startsWith("image/")) return;
        const result = await window.electronAPI?.saveImageFile?.(file);
        let url = result?.filePath;
        if (url) {
          // 윈도우 경로를 file:///로 바꿔서 넣기
          if (!/^file:\/\//.test(url)) url = "file:///" + url.replace(/\\/g, "/");
          setNoteContent((prev) => (prev ?? "") + `\n\n![](${url})\n`);
        }
      }
    };

    editor.addEventListener("drop", onDropOrPaste);
    editor.addEventListener("paste", onDropOrPaste);

    return () => {
      editor.removeEventListener("drop", onDropOrPaste);
      editor.removeEventListener("paste", onDropOrPaste);
    };
    // eslint-disable-next-line
  }, [mdEditorRef.current]);

  // 미리보기에서 C:\로 시작하는 경로 자동 치환
  const renderContent =
    noteContent.replace(
      /!\[(.*?)\]\((C:[^)]+)\)/g,
      (match, alt, p1) => `![${alt}](file:///${p1.replace(/\\/g, "/")})`
    );

  return (
    <div className="flex w-full h-full bg-gradient-to-br from-white to-indigo-50 relative">
      {/* 사이드바 */}
      <NoteSidebar
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed((v) => !v)}
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
      {/* 에디터+미리보기 */}
      <div className="flex flex-1">
        {/* 에디터 */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? "max-w-[60%]" : "max-w-[50%]"} flex-1 p-6 flex flex-col relative`}>
          {currentNote ? (
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-2 relative h-full"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
            >
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                className="text-2xl font-extrabold mb-2 bg-transparent border-b border-indigo-200 focus:outline-none focus:border-indigo-500"
              />
              <div className="rounded-xl border border-indigo-100 bg-gray-50 flex-1" ref={mdEditorRef}>
                <MDEditor
                  value={noteContent}
                  onChange={(v) => setNoteContent(v ?? "")}
                  height={'100%'}
                  preview="edit"
                  visibleDragbar={false}                  
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
        {/* 미리보기 */}
        <div className="flex-1 max-w-[50%] p-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 h-full overflow-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-indigo-500">미리보기</span>
            </div>
            {noteContent ? (
              <MDEditor.Markdown source={renderContent} className="prose custom-md-hd" remarkPlugins={[remarkBreaks]} />
            ) : (
              <div className="text-gray-300 text-center py-20">
                노트 내용이 없습니다
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
