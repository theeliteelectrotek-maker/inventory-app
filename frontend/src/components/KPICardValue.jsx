import React, { useRef, useEffect } from 'react';

export default function KPICardValue({ value, className = "", title = "" }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  const fmt = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num);
  };

  const displayVal = fmt(value);

  // Sizing bracket rules:
  // - < 1 lakh (< ₹100,000) → text-5xl
  // - 1 lakh to 10 lakh (₹100,000 to ₹1,000,000) → text-4xl
  // - 10 lakh+ (>= ₹1,000,000) → text-3xl
  const numericVal = Number(value) || 0;
  let baseClass = "text-5xl";
  let basePx = 48; // 3rem = 48px
  
  if (numericVal >= 100000 && numericVal < 1000000) {
    baseClass = "text-4xl";
    basePx = 36; // 2.25rem = 36px
  } else if (numericVal >= 1000000) {
    baseClass = "text-3xl";
    basePx = 30; // 1.875rem = 30px
  }

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const adjustFontSize = () => {
      // Reset font size to measure baseline
      text.style.fontSize = '';
      const containerWidth = container.clientWidth;
      const textWidth = text.scrollWidth;

      if (textWidth > containerWidth && containerWidth > 0) {
        const ratio = containerWidth / textWidth;
        // Scale down dynamically with a small safety margin (95%)
        const newSize = Math.max(12, Math.floor(basePx * ratio * 0.95));
        text.style.fontSize = `${newSize}px`;
      }
    };

    // Run adjustment initially
    adjustFontSize();

    // Setup ResizeObserver for responsive auto-scale down
    const observer = new ResizeObserver(() => {
      adjustFontSize();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, [displayVal, basePx]);

  return (
    <div ref={containerRef} className="w-full overflow-visible" title={title || displayVal}>
      <p
        ref={textRef}
        className={`${baseClass} font-extrabold tracking-tight mt-1 whitespace-nowrap ${className}`}
        style={{ display: 'inline-block', width: 'auto', maxWidth: '100%', overflow: 'visible' }}
      >
        {displayVal}
      </p>
    </div>
  );
}
