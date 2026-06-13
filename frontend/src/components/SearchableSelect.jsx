import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  required,
  renderOption,
  filterOption,
  loading = false,
  emptyPlaceholder = 'No matching product found'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus();
      }, 50);
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt => {
    if (filterOption) return filterOption(opt, search);
    return opt.label.toLowerCase().includes(search.toLowerCase());
  });

  // Reset active keyboard index when search term changes or options list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [search, filteredOptions.length]);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {/* Hidden select to preserve native form validation if required */}
      {required && (
        <select
          className="opacity-0 absolute -z-10 w-full h-full inset-0 pointer-events-none"
          value={value}
          onChange={() => { }}
          required
        >
          <option value="">Empty</option>
          {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      )}

      <div
        className="flex items-center justify-between w-full h-[42px] px-4 py-2.5 border border-slate-200 dark:border-[#334155] rounded-xl text-sm bg-white dark:bg-[#1E293B] cursor-pointer focus-within:ring-2 focus-within:ring-red-500"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <span className={`truncate mr-2 ${selectedOption ? 'text-slate-800 dark:text-[#F8FAFC]' : 'text-slate-400 dark:text-[#94A3B8]'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={15} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute right-0 sm:left-0 z-[60] mt-1 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl shadow-lg max-h-[300px] flex flex-col overflow-hidden min-w-full w-full sm:w-[500px]">
          <div className="p-2 border-b border-slate-100 dark:border-[#334155] shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-[#334155] rounded-lg text-sm text-slate-800 dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      setActiveIndex((prev) => (prev + 1) % filteredOptions.length);
                    }
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (filteredOptions.length > 0) {
                      setActiveIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                    }
                  } else if (e.key === 'Enter') {
                    if (filteredOptions.length > 0 && activeIndex >= 0 && activeIndex < filteredOptions.length) {
                      e.preventDefault();
                      onChange(filteredOptions[activeIndex].value);
                      setIsOpen(false);
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false);
                  }
                }}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {loading ? (
              <div className="p-3 text-sm text-center text-slate-500 dark:text-[#94A3B8]">Loading products...</div>
            ) : filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-center text-slate-500 dark:text-[#94A3B8]">{emptyPlaceholder}</div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-[#334155] ${
                    index === activeIndex ? 'bg-slate-100 dark:bg-[#334155]' : ''
                  } ${String(value) === String(opt.value) ? 'bg-red-50 dark:bg-red-950/40 text-red-600 font-medium' : 'text-slate-700 dark:text-[#CBD5E1]'}`}
                  onClick={() => {
                    console.log(`[DEBUG] SearchableSelect option clicked value=${opt.value} label=${opt.label}`);
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  {renderOption ? renderOption(opt) : opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
