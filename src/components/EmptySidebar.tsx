import React from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

interface EmptySidebarProps {
  open: boolean;
  onClose: () => void;
  label?: string;
  children?: React.ReactNode;
}

export function EmptySidebar({
  open,
  onClose,
  label = "메뉴",
  children,
}: EmptySidebarProps) {
  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: open ? 0 : -250 }}
      transition={{ type: "spring", stiffness: 250, damping: 25 }}
      className="fixed md:static top-0 left-0 h-full z-30 w-56 bg-white shadow-lg border-r flex flex-col p-4 gap-6"
      style={{ minHeight: "100vh" }}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-lg text-indigo-700">{label}</span>
        <button className="md:hidden" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 mt-6 select-none">
        {children ?? <span className="opacity-70">추가 기능 준비중...</span>}
      </div>
    </motion.aside>
  );
}

export default EmptySidebar;
