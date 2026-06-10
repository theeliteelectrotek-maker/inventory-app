import React, { useRef, useEffect } from 'react';

/**
 * KPICardValue – lightweight currency display component.
 * Formats a numeric value as Indian Rupee currency and automatically
 * scales down the font size if the rendered text overflows its container.
 *
 * Uses clamp(1.25rem, 2vw, 2.5rem) as the baseline, then scales down
 * dynamically via ResizeObserver if text still overflows.
 */
export default function KPICardValue({ value, className = '', title = '' }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  const fmt = (val) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const displayVal = fmt(value);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const adjustFontSize = () => {
      // Reset to let CSS clamp handle baseline
      text.style.fontSize = '';
      text.style.letterSpacing = '';

      const containerWidth = container.clientWidth;
      const textWidth = text.scrollWidth;

      if (textWidth > containerWidth && containerWidth > 0) {
        const ratio = containerWidth / textWidth;
        // Scale down with a 5% safety margin, floor at 12px
        const computedStyle = window.getComputedStyle(text);
        const currentFs = parseFloat(computedStyle.fontSize) || 20;
        const newFs = Math.max(12, Math.floor(currentFs * ratio * 0.95));
        text.style.fontSize = `${newFs}px`;
      }
    };

    adjustFontSize();

    const observer = new ResizeObserver(() => adjustFontSize());
    observer.observe(container);
    return () => observer.disconnect();
  }, [displayVal]);

  return (
    <div
      ref={containerRef}
      className="w-full min-w-0 overflow-hidden"
      title={title || displayVal}
    >
      <p
        ref={textRef}
        className={`font-extrabold tracking-tight leading-none mt-1 whitespace-nowrap ${className}`}
        style={{
          fontSize: 'clamp(1.25rem, 2vw, 2.5rem)',
          letterSpacing: '-0.03em',
          lineHeight: 1.05,
          display: 'block',
          maxWidth: '100%',
          overflow: 'hidden',
        }}
      >
        {displayVal}
      </p>
    </div>
  );
}
