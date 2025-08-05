import { useEffect, useRef, useState } from "react";

export function useTruncatedTooltip<T extends HTMLElement = HTMLElement>(text: string) {
  const ref = useRef<T>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const checkTruncate = () => {
      const el = ref.current;
      if (!el) return;
      // 텍스트가 실제로 잘렸는지 검사
      setShowTooltip(el.scrollWidth > el.offsetWidth);
    };
    checkTruncate();
    window.addEventListener("resize", checkTruncate);
    return () => window.removeEventListener("resize", checkTruncate);
  }, [text]);

  return { ref, showTooltip };
}
