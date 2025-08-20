"use client";
import { useEffect, useRef } from "react";

const isMobile = () =>
  typeof window !== "undefined" &&
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const MobileUIHider: React.FC = () => {
  const activatedRef = useRef(false);

  useEffect(() => {
    if (!isMobile()) return;
    if (sessionStorage.getItem("ui-hide-activated") === "1") {
      activatedRef.current = true;
      return;
    }

    const attemptHideUI = () => {
      if (activatedRef.current) return;
      activatedRef.current = true;
      sessionStorage.setItem("ui-hide-activated", "1");

      const root = document.documentElement as any;
      try {
        if (root.requestFullscreen) {
          root.requestFullscreen({ navigationUI: "hide" } as any).catch(() => {});
        } else if (root.webkitRequestFullscreen) {
          root.webkitRequestFullscreen();
        } else {
          // Legacy Android fallback
          const spacer = document.createElement("div");
          spacer.style.height = "2px";
          spacer.style.width = "1px";
          spacer.style.pointerEvents = "none";
          document.body.appendChild(spacer);

          requestAnimationFrame(() => window.scrollTo(0, 1));

          setTimeout(() => spacer.remove(), 500);
        }
      } catch {
        // Ignore
      }
    };

    const onFirstInteraction = () => {
      attemptHideUI();
      document.removeEventListener("pointerdown", onFirstInteraction);
      document.removeEventListener("touchend", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
    };

    document.addEventListener("pointerdown", onFirstInteraction, { passive: true });
    document.addEventListener("touchend", onFirstInteraction, { passive: true });
    document.addEventListener("keydown", onFirstInteraction);

    return () => {
      document.removeEventListener("pointerdown", onFirstInteraction);
      document.removeEventListener("touchend", onFirstInteraction);
      document.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  return null;
};

export default MobileUIHider;
