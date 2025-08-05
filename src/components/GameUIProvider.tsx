import React, { createContext, useContext, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";

// 타입 선언
interface Toast {
  id: number;
  message: string;
  type?: "info" | "success" | "error";
  duration?: number;
}
interface Alert {
  open: boolean;
  message: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
}

interface Confirm {
  open: boolean;
  message: string;
  resolve?: (result: boolean) => void;
  confirmText?: string;
  cancelText?: string;
}

interface GameUIContextType {
  showToast: (message: string, type?: Toast["type"], duration?: number) => void;
  showAlert: (options: {
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }) => void;
  showConfirm: (
    message: string,
    confirmText?: string,
    cancelText?: string
  ) => Promise<boolean>;
}

const GameUIContext = createContext<GameUIContextType | null>(null);

export function useGameUI() {
  const ctx = useContext(GameUIContext);
  if (!ctx) throw new Error("GameUIProvider로 감싸주세요");
  return ctx;
}

// GameUIProvider 컴포넌트
export const GameUIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast 관리
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Alert 관리
  const [alert, setAlert] = useState<Alert>({
    open: false,
    message: "",
    onConfirm: undefined,
    onCancel: undefined,
    confirmText: "확인",
    cancelText: "취소"
  });

  // Confirm 상태 추가
  const [confirm, setConfirm] = useState<Confirm>({
    open: false,
    message: "",
    resolve: undefined,
    confirmText: "확인",
    cancelText: "취소",
  });

  // Toast
  const showToast = useCallback(
    (message: string, type: Toast["type"] = "info", duration = 2500) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type, duration, created: Date.now() }]);
      // 자동 제거
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration + 200); // exit 모션 감안
    },
    []
  );

  // Alert
  const showAlert = useCallback((opts: Omit<Alert, "open">) => {
    setAlert({
      open: true,
      message: opts.message,
      onConfirm: opts.onConfirm,
      onCancel: opts.onCancel,
      confirmText: opts.confirmText ?? "확인",
      cancelText: opts.cancelText ?? "취소"
    });
  }, []);

  const closeAlert = () => setAlert(a => ({ ...a, open: false }));

  // showConfirm 구현
  const showConfirm = useCallback(
    (message: string, confirmText?: string, cancelText?: string) => {
      return new Promise<boolean>((resolve) => {
        setConfirm({
          open: true,
          message,
          resolve,
          confirmText: confirmText ?? "확인",
          cancelText: cancelText ?? "취소",
        });
      });
    },
    []
  );
  // Confirm 모달 닫기 및 결과 반환
  const closeConfirm = (result: boolean) => {
    confirm.resolve?.(result);
    setConfirm((c) => ({ ...c, open: false }));
  };

  // ------ 스타일 ------
  const toastColor = {
    info: "from-blue-300 via-blue-200 to-white",
    success: "from-green-400 via-green-300 to-white",
    error: "from-rose-400 via-rose-300 to-white"
  };

  return (
    <GameUIContext.Provider value={{ showToast, showConfirm, showAlert }}>
      {children}

      {/* Toast 모음 (오른쪽 상단) */}
      <div className="fixed top-6 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ x: 120, opacity: 0, scale: 0.7, rotate: 8 }}
              animate={{ x: 0, opacity: 1, scale: 1, rotate: [8, 0] }}
              exit={{ opacity: 0, scale: 0.85, y: -50, rotate: -8 }}
              transition={{
                type: "spring",
                duration: 1.05,    // 🟢 느리게!
                stiffness: 110,
                damping: 22
              }}
              className={`
                pointer-events-auto
                bg-gradient-to-r ${toastColor[toast.type ?? "info"]}
                shadow-2xl border-2
                ${toast.type === "success"
                  ? "border-green-400"
                  : toast.type === "error"
                    ? "border-rose-400"
                    : "border-blue-400"}
                text-[14px] font-bold px-4 py-2 rounded-xl flex items-center gap-2
                tracking-wide drop-shadow-md
                animate-[bounce_0.8s]
              `}
              style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif", minWidth: 120 }}
            >
              {toast.type === "success" && <span className="text-lg">🎉</span>}
              {toast.type === "error" && <span className="text-lg">⚠️</span>}
              {toast.type === "info" && <span className="text-lg">💬</span>}
              <span>{toast.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm 모달 */}
      <AnimatePresence>
        {confirm.open && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40, rotate: 6 }}
              animate={{ scale: 1.02, y: 0, rotate: [6, 0] }}
              exit={{ scale: 0.6, opacity: 0, y: -40 }}
              transition={{
                type: "spring",
                stiffness: 220,    // 🟢 더 부드럽게!
                damping: 28,
                duration: 0.8
              }}
              className="bg-gradient-to-br from-blue-200 via-white to-white border-4 border-blue-400 shadow-2xl rounded-3xl px-6 py-5 flex flex-col items-center text-center font-bold text-[15px] gap-4 max-w-xs"
              style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif" }}
            >
              <div className="text-xl text-blue-600 drop-shadow-lg">💡 확인!</div>
              <div className="whitespace-pre-line">{confirm.message}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => closeConfirm(false)}
                  className="px-4 py-1.5 rounded-lg font-bold border-2 border-blue-400 bg-white/90 hover:bg-blue-100 text-blue-600 shadow transition text-[13px]"
                >
                  {confirm.cancelText ?? "취소"}
                </button>
                <button
                  onClick={() => closeConfirm(true)}
                  className="px-4 py-1.5 rounded-lg font-bold border-2 border-blue-400 bg-blue-300 hover:bg-blue-400 text-blue-900 shadow transition text-[13px]"
                  autoFocus
                >
                  {confirm.confirmText ?? "확인"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert */}
      <AnimatePresence>
        {alert.open && (
          <motion.div
            className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.7, y: 40, rotate: 6 }}
              animate={{ scale: 1.02, y: 0, rotate: [6, 0] }}
              exit={{ scale: 0.6, opacity: 0, y: -40 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 27,
                duration: 0.75
              }}
              className="bg-gradient-to-br from-amber-200 via-amber-100 to-white border-4 border-amber-400 shadow-2xl rounded-3xl px-6 py-5 flex flex-col items-center text-center font-bold text-[15px] gap-4 max-w-xs"
              style={{ fontFamily: "DungGeunMo, Pretendard, sans-serif" }}
            >
              <div className="text-xl text-amber-600 drop-shadow-lg">⚔️ 알림!</div>
              <div className="whitespace-pre-line">{alert.message}</div>
              <div className="flex gap-2 mt-2">
                {alert.onCancel && (
                  <button
                    onClick={() => {
                      closeAlert();
                      alert.onCancel?.();
                    }}
                    className="px-4 py-1.5 rounded-lg font-bold border-2 border-amber-400 bg-white/90 hover:bg-amber-100 text-amber-600 shadow transition text-[13px]"
                  >
                    {alert.cancelText ?? "취소"}
                  </button>
                )}
                <button
                  onClick={() => {
                    closeAlert();
                    alert.onConfirm?.();
                  }}
                  className="px-4 py-1.5 rounded-lg font-bold border-2 border-amber-400 bg-amber-300 hover:bg-amber-400 text-amber-900 shadow transition text-[13px]"
                  autoFocus
                >
                  {alert.confirmText ?? "확인"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </GameUIContext.Provider>
  );
};
