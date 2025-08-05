import React, { useState, useRef, useEffect } from "react";
import { Plus, Trash2, Pencil, MoreVertical, Folder, FileText } from "lucide-react";
import type { FlashcardNode, Flashcard } from "../../types";
import { useGameUI } from "../GameUIProvider";

interface Props {
    tree: FlashcardNode[];
    onSelectCard: (folderId: string, cardId: string) => void;
    selectedCardId?: string;
    onAddCard?: (folderId: string) => void;
    onAddFolder?: (parentId?: string) => void;
    onRenameFolder?: (folderId: string, name: string) => void;
    onDeleteFolder?: (folderId: string) => void;
    onRenameCard?: (folderId: string, cardId: string, question: string) => void;
    onDeleteCard?: (folderId: string, cardId: string) => void;
    open: boolean;
    onClose: () => void;
}

export function FlashcardSidebar({
    tree,
    onSelectCard,
    selectedCardId,
    onAddCard,
    onAddFolder,
    onRenameFolder,
    onDeleteFolder,
    onRenameCard,
    onDeleteCard,
    open,
    onClose,
}: Props) {
    const [editFolderId, setEditFolderId] = useState<string | null>(null);
    const [editFolderName, setEditFolderName] = useState("");
    const [editCardId, setEditCardId] = useState<string | null>(null);
    const [editCardQuestion, setEditCardQuestion] = useState("");

    // 메뉴 오픈 id
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // 게임스타일 confirm, toast
    const { showConfirm, showToast } = useGameUI();

    // 외부 클릭 시 메뉴 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpenId(null);
            }
        };
        if (menuOpenId) {
            window.addEventListener("mousedown", handler);
        }
        return () => window.removeEventListener("mousedown", handler);
    }, [menuOpenId]);

    const renderTree = (node: FlashcardNode, depth = 0) => (
        <div key={node.id} className="mb-1 relative" style={{ paddingLeft: `${depth * 15}px` }}>
            <div
                className={`
          flex items-center gap-1 font-bold text-indigo-700 py-1 group text-xs
        `}
            >
                {/* 폴더 아이콘 & 이름 & 메뉴 */}
                {editFolderId === node.id ? (
                    <>
                        <Folder size={14} className="text-indigo-400 mr-0.5" />
                        <input
                            className="font-bold px-1 rounded border border-indigo-200 w-24 text-xs"
                            autoFocus
                            value={editFolderName}
                            onChange={(e) => setEditFolderName(e.target.value)}
                            onBlur={() => {
                                onRenameFolder && onRenameFolder(node.id, editFolderName.trim() || node.name);
                                setEditFolderId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onRenameFolder && onRenameFolder(node.id, editFolderName.trim() || node.name);
                                    setEditFolderId(null);
                                }
                            }}
                        />
                    </>
                ) : (
                    <>
                        <Folder size={14} className="text-indigo-400 mr-0.5" />
                        <span className="truncate max-w-[80px]">{node.name}</span>
                        {/* More 버튼(폴더 메뉴) */}
                        <button
                            className="ml-0.5 rounded hover:bg-indigo-100 p-1"
                            tabIndex={-1}
                            aria-label="더보기"
                            onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId((prev) => (prev === node.id ? null : node.id));
                            }}
                        >
                            <MoreVertical size={14} />
                        </button>
                        {/* 컨텍스트 메뉴 */}
                        {menuOpenId === node.id && (
                            <div
                                ref={menuRef}
                                className="absolute left-12 top-1 z-50 min-w-[140px] bg-white border-2 border-indigo-200 shadow-xl rounded-xl py-2 flex flex-col font-semibold text-xs"
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
                                    <Pencil size={12} /> 폴더명 수정
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-500"
                                    onClick={() => {
                                        onAddFolder && onAddFolder(node.id);
                                        setMenuOpenId(null);
                                    }}
                                >
                                    <Plus size={12} /> 하위 폴더 추가
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-indigo-50 text-indigo-500"
                                    onClick={() => {
                                        onAddCard && onAddCard(node.id);
                                        setMenuOpenId(null);
                                    }}
                                >
                                    <FileText size={12} /> 카드 추가
                                </button>
                                <button
                                    className="flex items-center gap-2 px-4 py-2 text-rose-500 hover:bg-rose-50"
                                    onClick={async () => {
                                        const ok = await showConfirm("이 폴더와 모든 하위 항목을 삭제할까요?", "삭제", "취소");
                                        setMenuOpenId(null);
                                        if (ok) {
                                            onDeleteFolder && onDeleteFolder(node.id);
                                            showToast("폴더가 삭제되었습니다.", "success");
                                        }
                                    }}
                                >
                                    <Trash2 size={12} /> 폴더 삭제
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
            {/* 카드 목록 */}
            {node.cards?.map((card) =>
                editCardId === card.id ? (
                    <div key={card.id} className="flex pl-6 items-center gap-1 text-xs">
                        <FileText size={12} className="text-amber-400" />
                        <input
                            className="px-1 rounded border border-indigo-100 w-20 text-xs"
                            value={editCardQuestion}
                            autoFocus
                            onChange={(e) => setEditCardQuestion(e.target.value)}
                            onBlur={() => {
                                onRenameCard && onRenameCard(node.id, card.id, editCardQuestion.trim() || card.question);
                                setEditCardId(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    onRenameCard && onRenameCard(node.id, card.id, editCardQuestion.trim() || card.question);
                                    setEditCardId(null);
                                }
                            }}
                        />
                    </div>
                ) : (
                    <div
                        key={card.id}
                        className={`
              pl-6 flex items-center gap-1 cursor-pointer rounded hover:bg-indigo-100 text-xs
              ${selectedCardId === card.id ? "bg-indigo-200 font-extrabold" : ""}
            `}
                    >
                        <FileText size={12} className="text-amber-400" />
                        <span
                            className="truncate max-w-[100px]"
                            onClick={() => onSelectCard(node.id, card.id)}
                            title={card.question}
                        >
                            {card.question}
                        </span>
                        <button
                            className="text-xs px-1 rounded hover:bg-indigo-100"
                            onClick={() => {
                                setEditCardId(card.id);
                                setEditCardQuestion(card.question);
                            }}
                            title="카드명 수정"
                        >
                            <Pencil size={12} />
                        </button>
                        {onDeleteCard && (
                            <button
                                className="text-xs text-red-400 hover:bg-red-100 px-1 rounded"
                                onClick={async () => {
                                    const ok = await showConfirm("정말 이 카드를 삭제할까요?", "삭제", "취소");
                                    if (ok) {
                                        onDeleteCard(node.id, card.id);
                                        showToast("카드가 삭제되었습니다.", "success");
                                    }
                                }}
                                title="카드 삭제"
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

    return (
        <aside
            className={`fixed md:static top-0 left-0 h-full z-30 w-56 bg-white shadow-lg border-r flex flex-col p-4 gap-3 transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                }`}            
        >
            <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-indigo-700">카테고리</span>
                <button className="md:hidden" onClick={onClose}>
                    ✕
                </button>
            </div>
            <div>{tree.map((node) => renderTree(node))}</div>
            {onAddFolder && (
                <button
                    className="flex items-center gap-2 mt-2 py-2 px-3 bg-indigo-100 hover:bg-indigo-300 text-indigo-900 font-bold rounded shadow text-xs"
                    onClick={() => onAddFolder(undefined)}
                >
                    <span className="text-lg">+</span>
                    <span>새 폴더</span>
                </button>
            )}
        </aside>
    );
}
