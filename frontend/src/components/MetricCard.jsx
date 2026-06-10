import React from 'react';

/**
 * MetricCard – reusable KPI/stat card component.
 *
 * Props:
 *  header        {string}            Card title label (required)
 *  value         {number|string}     The main displayed value (required)
 *  isCurrency    {boolean}           Format value as ₹ Indian currency (default: false)
 *  description   {React.ReactNode}   Small label/badge below the value
 *  icon          {React.ReactNode}   Optional icon element shown on the right side
 *  accentColor   {string}            Tailwind border-t-4 color class, e.g. "border-t-emerald-500"
 *  className     {string}            Extra classes on the outer card wrapper
 *  valueClassName {string}           Extra classes on the value element
 *  highlighted   {boolean}           Add a ring highlight (for "star" cards like Net Profit)
 *  ringColor     {string}            Tailwind ring color class when highlighted=true
 *  children      {React.ReactNode}   Extra content rendered at the bottom of the card
 */
export default function MetricCard({
  header,
  value,
  isCurrency = false,
  description,
  icon,
  accentColor = 'border-t-slate-400',
  className = '',
  valueClassName = '',
  highlighted = false,
  ringColor = 'ring-[#10B981]',
  children,
}) {
  const displayValue = React.useMemo(() => {
    if (value === undefined || value === null) {
      return isCurrency ? '₹0.00' : '0';
    }
    if (isCurrency) {
      const num = Number(value) || 0;
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    }
    return String(value);
  }, [value, isCurrency]);

  const ringClasses = highlighted
    ? `ring-2 ${ringColor} ring-offset-2 dark:ring-offset-[#0F172A]`
    : '';

  return (
    <div
      className={[
        // Container – fixes overflow globally
        'min-w-0 w-full overflow-hidden',
        'flex flex-col justify-between',
        'bg-white dark:bg-[#111827]',
        'border border-slate-200 dark:border-[#1E293B]',
        `border-t-4 ${accentColor}`,
        'rounded-2xl p-5',
        'shadow-md shadow-slate-100/50 dark:shadow-none',
        'hover:shadow-lg dark:hover:shadow-none hover:-translate-y-0.5',
        'transition-all duration-300',
        'h-full',
        ringClasses,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block leading-tight min-w-0 flex-1">
          {header}
        </span>
        {icon && (
          <div className="flex-shrink-0 ml-1">{icon}</div>
        )}
      </div>

      {/* Value */}
      <div className="min-w-0 w-full mt-2">
        <p
          className={[
            'font-extrabold leading-none tracking-tight',
            'break-words max-w-full min-w-0 w-full',
            'overflow-wrap-anywhere',
            valueClassName,
          ]
            .filter(Boolean)
            .join(' ')}
          style={{
            fontSize: 'clamp(1.25rem, 2vw, 2.5rem)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            overflowWrap: 'break-word',
            wordBreak: 'break-word',
          }}
          title={displayValue}
        >
          {displayValue}
        </p>
      </div>

      {/* Description / badge */}
      {(description || children) && (
        <div className="mt-3 min-w-0">
          {description && (
            <div className="text-[10px] font-bold text-slate-400 dark:text-[#94A3B8] bg-slate-50 dark:bg-[#1E293B] px-2.5 py-1 rounded-lg self-start inline-flex items-center gap-1 max-w-full truncate">
              {description}
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
