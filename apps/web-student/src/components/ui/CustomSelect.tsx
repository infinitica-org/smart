'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  label: string;
  value: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  optionClassName?: string;
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  dropdownClassName = '',
  optionClassName = '',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuBox, setMenuBox] = useState({
    left: 0,
    width: 0,
    top: 0,
    bottom: 0,
    openUp: false,
    maxHeight: 240,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = 'smart-select-menu';

  const selectedOption = options.find((opt) => opt.value === value);

  const placeMenu = () => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const gap = 8;
    const spaceAbove = rect.top - gap;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const maxHeight = Math.min(240, Math.max(120, openUp ? spaceAbove : spaceBelow));
    setMenuBox({
      left: rect.left,
      width: rect.width,
      top: rect.bottom + gap,
      bottom: window.innerHeight - rect.top + gap,
      openUp,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (!isOpen) return;
    placeMenu();
  }, [isOpen]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const menu = document.getElementById('smart-select-menu');
        if (menu?.contains(e.target as Node)) return;
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onMove = () => placeMenu();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between text-left focus:outline-none h-full"
      >
        <span className={selectedOption ? 'text-white truncate' : 'text-white/40 truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00fad0]' : 'text-white/40'}`}
        />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <motion.div
                id={menuId}
                initial={{ opacity: 0, y: menuBox.openUp ? 6 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: menuBox.openUp ? 6 : -6 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: 'fixed',
                  left: menuBox.left,
                  width: menuBox.width,
                  zIndex: 80,
                  maxHeight: menuBox.maxHeight,
                  ...(menuBox.openUp ? { bottom: menuBox.bottom } : { top: menuBox.top }),
                }}
                className={`bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-y-auto ${dropdownClassName}`}
              >
                <div className="p-1 flex flex-col gap-1">
                  {options.map((option) => {
                    const isSelected = option.value === value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onChange(option.value);
                          setIsOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm ${
                          isSelected
                            ? 'bg-[#00fad0]/10 text-[#00fad0]'
                            : 'text-white/70 hover:bg-white/5 hover:text-white'
                        } ${optionClassName}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
