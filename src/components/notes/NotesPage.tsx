import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NoteSidebar } from "./NoteSidebar";
import MDEditor from "@uiw/react-md-editor";
import { motion, AnimatePresence } from "framer-motion";
import type { FolderNode, NoteMeta } from "../../types";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import { Menu } from "lucide-react";

export const NotesPage: React.FC = () => {
  // ---- 트리(메타)만 메모리에 유지 ----
  const [tree, setTree] = useState<FolderNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // ---- 현재 노트(메타/본문 분리) ----
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const currentNoteMetaRef = useRef<NoteMeta | null>(null);

  // UI 상태
  const [saved, setSaved] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);

  // 레퍼런스/가드
  const mdEditorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const lastLoadedRef = useRef<{ id: string; contentPath?: string } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHandleAtRef = useRef<number>(0); // paste/drop re-entrancy guard

  // ===== 초기: 트리(메타)만 로드 =====
  useEffect(() => {
    (async () => {
      const meta = await window.electronAPI.loadNoteTree();
      setTree(meta ?? []);
    })();
  }, []);

  // ===== 유틸: 현재 선택된 노트 메타 찾기 =====
  const findNoteMeta = useCallback(
    (folderId: string | null, noteId: string | null): NoteMeta | null => {
      if (!folderId || !noteId) return null;
      const stack: FolderNode[] = [...tree];
      while (stack.length) {
        const node = stack.pop()!;
        if (node.id === folderId && node.notes) {
          const found = node.notes.find((n) => n.id === noteId);
          if (found) return found;
        }
        if (node.children?.length) stack.push(...node.children);
      }
      return null;
    },
    [tree]
  );

  // ===== 노트 선택 시: 본문 지연 로드 =====
  useEffect(() => {
    const load = async () => {
      const meta = findNoteMeta(selectedFolderId, selectedNoteId);
      currentNoteMetaRef.current = meta ?? null;

      setNoteTitle(meta?.title ?? "");
      if (!meta) {
        setNoteContent("");
        return;
      }

      // 동일 시그니처면 재로드 스킵
      const currentSig = { id: meta.id, contentPath: (meta as any).contentPath };
      if (
        lastLoadedRef.current &&
        lastLoadedRef.current.id === currentSig.id &&
        lastLoadedRef.current.contentPath === currentSig.contentPath
      ) {
        return;
      }

      const content = await window.electronAPI.loadNoteContent({
        noteId: meta.id,
        contentPath: (meta as any).contentPath,
      });
      setNoteContent(content ?? "");
      lastLoadedRef.current = currentSig;
    };
    load();
  }, [findNoteMeta, selectedFolderId, selectedNoteId]);

  // ===== 트리 조작 (메타만 저장) =====
  const persistTree = useCallback(async (next: FolderNode[]) => {
    setTree(next);
    await window.electronAPI.saveNoteTree(next);
  }, []);

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
              { id: newId, title: "새 노트" } as NoteMeta, // 본문은 파일로 관리
            ],
          };
        }
        return node.children ? { ...node, children: update(node.children) } : node;
      });

    const next = update(tree);
    persistTree(next);
    setSelectedFolderId(folderId);
    setSelectedNoteId(newId);
  };

  const handleAddFolder = (parentId?: string) => {
    const newId = "cat-" + Date.now();
    const update = (nodes: FolderNode[]): FolderNode[] => {
      if (!parentId) {
        return [...nodes, { id: newId, name: "새 폴더", children: [], notes: [] }];
      }
      return nodes.map((node) =>
        node.id === parentId
          ? {
            ...node,
            children: [...(node.children ?? []), { id: newId, name: "새 폴더", children: [], notes: [] }],
          }
          : node.children
            ? { ...node, children: update(node.children) }
            : node
      );
    };
    persistTree(update(tree));
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) =>
        node.id === folderId ? { ...node, name } : node.children ? { ...node, children: update(node.children) } : node
      );
    persistTree(update(tree));
  };

  const handleDeleteFolder = (folderId: string) => {
    const remove = (nodes: FolderNode[]): FolderNode[] =>
      nodes
        .filter((n) => n.id !== folderId)
        .map((n) => (n.children ? { ...n, children: remove(n.children) } : n));
    const next = remove(tree);
    persistTree(next);
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    if (currentNoteMetaRef.current?.id === selectedNoteId) setSelectedNoteId(null);
  };

  const handleRenameNote = (folderId: string, noteId: string, title: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.notes) {
          return {
            ...node,
            notes: node.notes.map((n) => (n.id === noteId ? { ...n, title } : n)),
          };
        }
        return node.children ? { ...node, children: update(node.children) } : node;
      });
    persistTree(update(tree));
    if (selectedNoteId === noteId) setNoteTitle(title);
  };

  const handleDeleteNote = (folderId: string, noteId: string) => {
    const update = (nodes: FolderNode[]): FolderNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.notes) {
          return { ...node, notes: node.notes.filter((n) => n.id !== noteId) };
        }
        return node.children ? { ...node, children: update(node.children) } : node;
      });
    const next = update(tree);
    persistTree(next);
    if (selectedNoteId === noteId) setSelectedNoteId(null);
  };

  // ===== 본문 저장 (지연 저장 & 파일만 저장) =====
  function updateNoteContentPathInTree(
    nodes: FolderNode[],
    noteId: string,
    newPath: string
  ): FolderNode[] {
    return nodes.map((node) => {
      let notes = node.notes;
      if (notes && notes.length) {
        notes = notes.map((n) => (n.id === noteId ? { ...n, contentPath: newPath } : n));
      }
      let children = node.children;
      if (children && children.length) {
        children = updateNoteContentPathInTree(children, noteId, newPath);
      }
      return { ...node, ...(notes ? { notes } : {}), ...(children ? { children } : {}) };
    });
  }

  const scheduleSaveContent = useCallback(
    (immediate = false) => {
      const meta = currentNoteMetaRef.current;
      if (!meta) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      const run = async () => {
        const { contentPath: newPath } = await window.electronAPI.saveNoteContent({
          noteId: meta.id,
          content: noteContent,
          contentPath: (meta as any).contentPath,
        });

        if ((meta as any).contentPath === newPath) {
          setSaved(true);
          setTimeout(() => setSaved(false), 900);
          return;
        }

        (meta as any).contentPath = newPath;

        setTree((prev) => updateNoteContentPathInTree(prev, meta.id, newPath));

        // contentPath 갱신 시에만 트리 저장
        await window.electronAPI.saveNoteTree(await window.electronAPI.loadNoteTree());

        setSaved(true);
        setTimeout(() => setSaved(false), 900);

        if (lastLoadedRef.current?.id === meta.id) {
          lastLoadedRef.current = { id: meta.id, contentPath: newPath };
        }
      };

      if (immediate) run();
      else saveTimerRef.current = setTimeout(run, 10000);
    },
    [noteContent]
  );

  useEffect(() => {
    if (!currentNoteMetaRef.current) return;
    scheduleSaveContent(false);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [noteContent, scheduleSaveContent]);

  const forceSave = useCallback(() => scheduleSaveContent(true), [scheduleSaveContent]);

  // ===== 📎 이미지 드롭/붙여넣기 (입력 노드 의존 X, 캡처 레벨에서 안정 처리) =====
  useEffect(() => {
    const root = mdEditorRef.current;
    if (!root) return;

    const isReentry = (ts?: number) => {
      const now = ts ?? Date.now();
      if (now - lastHandleAtRef.current < 120) return true;
      lastHandleAtRef.current = now;
      return false;
    };

    // 파일 또는 URL 추출
    const pickImageOrUrl = (e: any): { file?: File; url?: string } | null => {
      // clipboard items
      const items = e.clipboardData?.items;
      if (items && items.length) {
        for (let i = 0; i < items.length; i++) {
          const it = items[i];
          if (it.kind === "file") {
            const f = it.getAsFile?.();
            if (f && f.type?.startsWith("image/")) return { file: f };
          }
        }
      }
      // clipboard files
      const cfiles = e.clipboardData?.files;
      if (cfiles?.length && cfiles[0].type?.startsWith("image/")) return { file: cfiles[0] };

      // drag & drop items
      const dtItems = e.dataTransfer?.items;
      if (dtItems && dtItems.length) {
        for (let i = 0; i < dtItems.length; i++) {
          const it = dtItems[i];
          if (it.kind === "file") {
            const f = it.getAsFile?.();
            if (f && f.type?.startsWith("image/")) return { file: f };
          }
        }
      }
      // drag & drop files
      const dfiles = e.dataTransfer?.files;
      if (dfiles?.length && dfiles[0].type?.startsWith("image/")) return { file: dfiles[0] };

      // 브라우저에서 이미지 URL 드롭
      const uri = e.dataTransfer?.getData?.("text/uri-list");
      if (uri && /^https?:\/\//i.test(uri)) return { url: uri };

      return null;
    };

    const insertMarkdown = (url: string) => {
      if (!/^file:\/\//.test(url) && /^[A-Za-z]:[\\/]/.test(url)) {
        url = "file:///" + url.replace(/\\/g, "/");
      }
      setNoteContent((prev) => (prev ?? "") + `\n\n![](${url})\n`);
    };

    const saveThenInsert = async (file: File) => {
      console.log(file);
      const { filePath } = await window.electronAPI.saveImageFile(file);
      let url = filePath;
      if (url && !/^file:\/\//.test(url)) url = "file:///" + url.replace(/\\/g, "/");
      insertMarkdown(url);
    };

    // 문서 캡처: paste
    const onPasteDocCapture = async (e: ClipboardEvent) => {
      // 원래는 mdEditorRef 안쪽만 허용했지만 → 모든 경우 허용
      const picked = pickImageOrUrl(e);
      if (!picked) return;
      if (isReentry((e as any).timeStamp)) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        if (picked.file) await saveThenInsert(picked.file);
        else if (picked.url) insertMarkdown(picked.url);
      } catch (err) {
        console.error("paste save failed:", err);
      }
    };

    // 윈도우 캡처: drop
    const onWindowDropCapture = async (e: DragEvent) => {
      const picked = pickImageOrUrl(e);
      if (!picked) return;
      if (isReentry((e as any).timeStamp)) return;

      e.preventDefault();
      e.stopPropagation();

      try {
        if (picked.file) await saveThenInsert(picked.file);
        else if (picked.url) insertMarkdown(picked.url);
      } catch (err) {
        console.error("drop save failed:", err);
      }
    };


    // OS 네비게이션 방지 + 에디터 기본 드롭 방지
    const preventWindowNav = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", preventWindowNav, false);
    window.addEventListener("drop", preventWindowNav, false);
    const preventOnEditor = (e: DragEvent) => e.preventDefault();
    root.addEventListener("dragover", preventOnEditor);
    root.addEventListener("drop", preventOnEditor);

    document.addEventListener("paste", onPasteDocCapture as any, true);
    window.addEventListener("drop", onWindowDropCapture as any, true);

    return () => {
      window.removeEventListener("dragover", preventWindowNav, false);
      window.removeEventListener("drop", preventWindowNav, false);
      root.removeEventListener("dragover", preventOnEditor);
      root.removeEventListener("drop", preventOnEditor);
      document.removeEventListener("paste", onPasteDocCapture as any, true);
      window.removeEventListener("drop", onWindowDropCapture as any, true);
    };
  }, [mdEditorRef.current]);

  // 미리보기 스크롤 아래 고정
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [noteContent]);

  // 미리보기용 경로 치환(C:\ → file:///)
  const renderContent = useMemo(() => {
    return (noteContent ?? "").replace(
      /!\[(.*?)\]\((C:[^)]+)\)/g,
      (_m, alt, p1) => `![${alt}](file:///${p1.replace(/\\/g, "/")})`
    );
  }, [noteContent]);

  return (
    <div className="flex w-full h-full bg-gradient-to-br from-white to-indigo-50 relative">
      {/* 햄버거 버튼 */}
      {sidebarCollapsed && (
        <button
          className="fixed top-[91%] left-6 z-50 bg-white shadow-lg border border-indigo-100 rounded-xl p-2 flex items-center justify-center hover:bg-indigo-50 transition"
          style={{ width: 46, height: 46 }}
          onClick={() => setSidebarCollapsed(false)}
          aria-label="사이드바 열기"
        >
          <Menu size={26} className="text-indigo-700" />
        </button>
      )}

      {/* 사이드바 (오버레이) */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/10 z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarCollapsed(true)}
            />
            <motion.div
              className="fixed top-0 left-0 z-50 h-full"
              initial={{ x: -260, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -260, opacity: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.22 }}
              style={{ width: 224, minWidth: 224, maxWidth: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <NoteSidebar
                collapsed={false}
                onCollapse={() => setSidebarCollapsed(true)}
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 에디터 + 미리보기 */}
      <div className="flex-1 flex flex-row items-stretch min-w-0">
        <button
          className="fixed top-26 right-8 z-20 px-4 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 font-bold shadow hover:bg-indigo-200 transition"
          onClick={() => setPreviewOnly((v) => !v)}
          style={{ minWidth: 90 }}
        >
          {previewOnly ? "편집모드" : "미리보기만"}
        </button>

        {/* 에디터 */}
        {!previewOnly && (
          <div className="flex-1 min-w-0 p-6 flex flex-col relative" style={{ flexBasis: "50%" }}>
            {selectedNoteId ? (
              <motion.div
                className="bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-2 relative h-full"
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
              >
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => {
                    const title = e.target.value;
                    setNoteTitle(title);
                    const meta = currentNoteMetaRef.current;
                    if (!meta) return;
                    handleRenameNote(selectedFolderId!, meta.id, title);
                  }}
                  className="text-2xl font-extrabold mb-2 bg-transparent border-b border-indigo-200 focus:outline-none focus:border-indigo-500"
                  style={{ wordBreak: "break-all" }}
                />
                <div
                  className="rounded-xl border border-indigo-100 bg-gray-50 flex-1 max-h-[85%] overflow-x-auto"
                  ref={mdEditorRef}
                  data-color-mode="light"
                  style={{ minWidth: 0, wordBreak: "break-all" }}
                >
                  <MDEditor
                    value={noteContent}
                    onChange={(v) => setNoteContent(v ?? "")}
                    height={"100%"}
                    preview="edit"
                    visibleDragbar={false}
                  />
                </div>
                <div className="flex justify-end gap-2 mt-2">
                  <motion.button
                    whileHover={{ scale: 1.07 }}
                    className="px-5 py-2 bg-indigo-600 text-white rounded-xl shadow font-bold"
                    onClick={forceSave}
                  >
                    저장
                  </motion.button>
                </div>

                <AnimatePresence>
                  {saved && (
                    <motion.div
                      initial={{ opacity: 0, y: 0 }}
                      animate={{ opacity: 1, y: -30 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-2 right-8 bg-green-500 text-white rounded-lg shadow-lg px-4 py-2"
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
        )}

        {/* 미리보기 */}
        <div className="flex-1 min-w-0 p-6" style={{ flexBasis: "50%" }}>
          <div
            className="bg-white rounded-2xl shadow-xl p-6 h-full overflow-auto"
            ref={previewRef}
            style={{ maxHeight: "calc(100vh - 48px)", minWidth: 0 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="font-bold text-indigo-500">미리보기</span>
            </div>
            {noteContent ? (
              <MDEditor.Markdown
                source={renderContent}
                className="prose custom-md-hd break-all"
                rehypePlugins={[rehypeKatex]}
                remarkPlugins={[remarkBreaks, remarkGfm]}
                style={{ wordBreak: "break-all", background: "white", color: "black" }}
              />
            ) : (
              <div className="text-gray-300 text-center py-20">노트 내용이 없습니다</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
