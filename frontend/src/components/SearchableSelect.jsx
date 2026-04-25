import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select...', className = '', required }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

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
        className="flex items-center justify-between w-full h-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white cursor-pointer focus-within:ring-2 focus-within:ring-red-500"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearch('');
        }}
      >
        <span className={`truncate mr-2 ${selectedOption ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={15} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-[60] mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 flex flex-col overflow-hidden min-w-full w-[598px]">
          <div className="p-2 border-b border-slate-100 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoFocus
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredOptions.length > 0) {
                    e.preventDefault();
                    onChange(filteredOptions[0].value);
                    setIsOpen(false);
                  }
                }}
              />
            </div>
          </div>
          <div className="overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-center text-slate-500">No results found</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt.value}
                  className={`px-3 py-2 text-sm cursor-pointer whitespace-nowrap hover:bg-slate-50 ${String(value) === String(opt.value) ? 'bg-red-50 text-red-600 font-medium' : 'text-slate-700'}`}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
