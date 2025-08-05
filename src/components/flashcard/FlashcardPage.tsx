import React, { useState, useEffect, useMemo } from "react";
import { FlashcardSidebar } from "./FlashcardSidebar";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Pencil } from "lucide-react";
import type { FlashcardNode, Flashcard } from "../../types";

export const FlashcardsPage: React.FC<{
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}> = ({ sidebarOpen, setSidebarOpen }) => {
  const [tree, setTree] = useState<FlashcardNode[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // 수정 모드
  const [editMode, setEditMode] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  // 첫 로딩
  useEffect(() => {
    window.electronAPI?.loadFlashcards?.().then((data) => {
      if (data) setTree(data);
    });
  }, []);

  // 현재 폴더 카드 목록/현재카드
  const currentFolderCards = useMemo(() => {
    const find = (nodes: FlashcardNode[]): Flashcard[] => {
      for (const node of nodes) {
        if (node.id === selectedFolderId && node.cards) {
          return node.cards;
        }
        if (node.children) {
          const found = find(node.children);
          if (found.length) return found;
        }
      }
      return [];
    };
    return selectedFolderId ? find(tree) : [];
  }, [tree, selectedFolderId]);

  const currentIndex = useMemo(
    () => currentFolderCards.findIndex((c) => c.id === selectedCardId),
    [currentFolderCards, selectedCardId]
  );
  const currentCard = currentIndex >= 0 ? currentFolderCards[currentIndex] : null;

  // 카드 flip 상태
  const [showAnswer, setShowAnswer] = useState(false);

  // 카드 바뀌면 정답 숨기고, 수정모드 해제
  useEffect(() => {
    setShowAnswer(false);
    setEditMode(false);
    setQuestion(currentCard?.question ?? "");
    setAnswer(currentCard?.answer ?? "");
  }, [selectedCardId, selectedFolderId]);

  // 카드 저장
  const handleSaveCard = () => {
    if (!selectedFolderId || !selectedCardId) return;
    handleRenameCard(selectedFolderId, selectedCardId, question);
    handleEditCardAnswer(selectedFolderId, selectedCardId, answer);
    setEditMode(false);
  };

  // ---- 트리/카드 수정 함수들 (동일) ----
  const handleAddFolder = (parentId?: string) => {
    const newId = "fcat-" + Date.now();
    const update = (nodes: FlashcardNode[]): FlashcardNode[] => {
      if (!parentId) {
        return [
          ...nodes,
          { id: newId, name: "새 폴더", children: [], cards: [] },
        ];
      }
      return nodes.map((node) =>
        node.id === parentId
          ? {
              ...node,
              children: [
                ...(node.children ?? []),
                { id: newId, name: "새 폴더", children: [], cards: [] },
              ],
            }
          : node.children
          ? { ...node, children: update(node.children) }
          : node
      );
    };
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveFlashcards?.(updated);
  };

  const handleRenameFolder = (folderId: string, name: string) => {
    const update = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes.map((node) =>
        node.id === folderId
          ? { ...node, name }
          : node.children
          ? { ...node, children: update(node.children) }
          : node
      );
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveFlashcards?.(updated);
  };

  const handleDeleteFolder = (folderId: string) => {
    const remove = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes
        .filter((node) => node.id !== folderId)
        .map((node) =>
          node.children ? { ...node, children: remove(node.children) } : node
        );
    const updated = remove(tree);
    setTree(updated);
    window.electronAPI?.saveFlashcards?.(updated);
    if (selectedFolderId === folderId) setSelectedFolderId(null);
    if (selectedCardId && currentCard?.id === selectedCardId)
      setSelectedCardId(null);
  };

  const handleAddCard = (folderId: string) => {
    const newId = "card-" + Date.now();
    const update = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes.map((node) => {
        if (node.id === folderId) {
          return {
            ...node,
            cards: [
              ...(node.cards ?? []),
              { id: newId, question: "새 카드 문제", answer: "" },
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
    window.electronAPI?.saveFlashcards?.(updated);
    setSelectedFolderId(folderId);
    setSelectedCardId(newId);
  };

  const handleRenameCard = (
    folderId: string,
    cardId: string,
    question: string
  ) => {
    const update = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.cards) {
          return {
            ...node,
            cards: node.cards.map((c) =>
              c.id === cardId ? { ...c, question } : c
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
    window.electronAPI?.saveFlashcards?.(updated);
  };

  const handleDeleteCard = (folderId: string, cardId: string) => {
    const update = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.cards) {
          return {
            ...node,
            cards: node.cards.filter((c) => c.id !== cardId),
          };
        }
        if (node.children) {
          return { ...node, children: update(node.children) };
        }
        return node;
      });
    const updated = update(tree);
    setTree(updated);
    window.electronAPI?.saveFlashcards?.(updated);
    if (selectedCardId === cardId) setSelectedCardId(null);
  };

  const handleEditCardAnswer = (folderId: string, cardId: string, answer: string) => {
    const update = (nodes: FlashcardNode[]): FlashcardNode[] =>
      nodes.map((node) => {
        if (node.id === folderId && node.cards) {
          return {
            ...node,
            cards: node.cards.map((c) =>
              c.id === cardId ? { ...c, answer } : c
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
    window.electronAPI?.saveFlashcards?.(updated);
  };

  // 카드 이동
  const handlePrev = () => {
    if (currentFolderCards.length === 0 || currentIndex <= 0) return;
    setSelectedCardId(currentFolderCards[currentIndex - 1].id);
  };
  const handleNext = () => {
    if (currentFolderCards.length === 0 || currentIndex >= currentFolderCards.length - 1) return;
    setSelectedCardId(currentFolderCards[currentIndex + 1].id);
  };

  // ---- 메인 ----
  return (
    <div className="flex w-full h-full">
      <FlashcardSidebar
        tree={tree}
        onSelectCard={(folderId, cardId) => {
          setSelectedFolderId(folderId);
          setSelectedCardId(cardId);
        }}
        selectedCardId={selectedCardId ?? undefined}
        onAddCard={handleAddCard}
        onAddFolder={handleAddFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onRenameCard={handleRenameCard}
        onDeleteCard={handleDeleteCard}
        open={sidebarOpen || window.innerWidth >= 768}
        onClose={() => setSidebarOpen(false)}
      />
      {/* 메인 카드 상세 */}
      <div className="flex-1 flex flex-col gap-5 p-6 items-center justify-center">
        {currentCard ? (
          <div className="relative flex flex-col items-center w-full max-w-xl">
            {/* 네비 */}
            <div className="flex justify-between w-full mb-3 px-3">
              <button
                onClick={handlePrev}
                disabled={currentIndex <= 0}
                className={`p-2 rounded-full border ${currentIndex <= 0 ? "text-gray-300 border-gray-100" : "text-indigo-500 border-indigo-300 hover:bg-indigo-100"}`}
                tabIndex={-1}
                aria-label="이전 카드"
              >
                <ArrowLeft size={22} />
              </button>
              <button
                onClick={handleNext}
                disabled={currentIndex >= currentFolderCards.length - 1}
                className={`p-2 rounded-full border ${currentIndex >= currentFolderCards.length - 1 ? "text-gray-300 border-gray-100" : "text-indigo-500 border-indigo-300 hover:bg-indigo-100"}`}
                tabIndex={-1}
                aria-label="다음 카드"
              >
                <ArrowRight size={22} />
              </button>
            </div>
            {/* 카드 본문 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedCardId + (showAnswer ? "-answer" : "-question") + (editMode ? "-edit" : "")}
                initial={{ rotateY: 90, opacity: 0, scale: 0.97 }}
                animate={{ rotateY: 0, opacity: 1, scale: 1 }}
                exit={{ rotateY: -90, opacity: 0, scale: 0.97 }}
                transition={{ type: "spring", duration: 0.35 }}
                className="bg-white rounded-2xl shadow-xl w-full max-w-xl min-h-[210px] flex flex-col items-center justify-center gap-6 py-12 px-6"
                style={{ backfaceVisibility: "hidden" }}
              >
                {!editMode ? (
                  <>
                    {!showAnswer ? (
                      <>
                        <div className="text-xl md:text-2xl font-extrabold text-indigo-700 mb-3 text-center break-words whitespace-pre-line min-h-[48px]">
                          {currentCard.question}
                        </div>
                        <button
                          className="px-6 py-2 mt-3 rounded-xl font-bold border-2 border-amber-400 bg-amber-100 hover:bg-amber-200 text-amber-800 shadow transition"
                          onClick={() => setShowAnswer(true)}
                        >
                          정답 보기
                        </button>
                        <button
                          className="absolute top-4 right-5 p-1 rounded hover:bg-indigo-100 text-indigo-400"
                          onClick={() => setEditMode(true)}
                          title="수정"
                        >
                          <Pencil size={18} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-base md:text-lg font-semibold text-green-700 text-center whitespace-pre-line break-words min-h-[32px]">
                          {currentCard.answer || <span className="text-gray-400">(답변 없음)</span>}
                        </div>
                        <button
                          className="absolute top-4 right-5 p-1 rounded hover:bg-indigo-100 text-indigo-400"
                          onClick={() => setEditMode(true)}
                          title="수정"
                        >
                          <Pencil size={18} />
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="font-bold text-indigo-600 text-xs mb-1 block">문제(수정)</label>
                      <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="w-full p-2 border-b border-indigo-300 focus:outline-none text-base font-bold bg-transparent"
                      />
                    </div>
                    <div className="mt-3">
                      <label className="font-bold text-green-600 text-xs mb-1 block">답변(수정)</label>
                      <textarea
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="w-full p-2 border-b border-green-300 focus:outline-none text-base bg-gray-50 rounded"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2 w-full">
                      <button
                        className="px-5 py-2 rounded-xl font-bold border-2 border-indigo-400 bg-white hover:bg-indigo-50 text-indigo-700 shadow transition"
                        onClick={handleSaveCard}
                      >
                        저장
                      </button>
                      <button
                        className="px-5 py-2 rounded-xl font-bold border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-600 shadow transition"
                        onClick={() => {
                          setEditMode(false);
                          setQuestion(currentCard.question ?? "");
                          setAnswer(currentCard.answer ?? "");
                        }}
                      >
                        취소
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-gray-400 text-center">카드를 선택하세요!</div>
        )}
      </div>
    </div>
  );
};
