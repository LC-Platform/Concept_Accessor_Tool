import React, { useEffect, useRef } from "react";

export default function BottomSheet({ isOpen, onClose, title, icon, children, maxHeight = "80vh" }) {
  const sheetRef = useRef(null);
  const startYRef = useRef(null);
  const currentYRef = useRef(null);

  // swipe-down-to-close
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const onTouchStart = (e) => {
      startYRef.current = e.touches[0].clientY;
      currentYRef.current = 0;
      sheet.style.transition = "none";
    };

    const onTouchMove = (e) => {
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta < 0) return;
      currentYRef.current = delta;
      sheet.style.transform = `translateY(${delta}px)`;
    };

    const onTouchEnd = () => {
      sheet.style.transition = "transform 0.28s cubic-bezier(0.4,0,0.2,1)";
      if (currentYRef.current > 120) {
        onClose();
      } else {
        sheet.style.transform = "translateY(0)";
      }
    };

    sheet.addEventListener("touchstart", onTouchStart, { passive: true });
    sheet.addEventListener("touchmove", onTouchMove, { passive: true });
    sheet.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      sheet.removeEventListener("touchstart", onTouchStart);
      sheet.removeEventListener("touchmove", onTouchMove);
      sheet.removeEventListener("touchend", onTouchEnd);
    };
  }, [onClose]);

  // reset transform when re-opened
  useEffect(() => {
    if (isOpen && sheetRef.current) {
      sheetRef.current.style.transform = "";
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop: flat sibling, not a wrapper — no z-stacking confusion */}
      <div
        className="bs-backdrop-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet sits above backdrop via z-index */}
      <div
        ref={sheetRef}
        className="bs-sheet bs-sheet-visible"
        style={{ maxHeight }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Panel"}
      >
        <div className="bs-handle-bar" />

        <div className="bs-header">
          <div className="bs-title">
            {icon && <span className="bs-title-icon">{icon}</span>}
            {title}
          </div>
          <button
            className="bs-close-btn"
            onClick={onClose}
            aria-label="Close panel"
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="bs-body">
          {children}
        </div>
      </div>
    </>
  );
}