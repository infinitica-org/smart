'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import type { SelectOption } from './CustomSelect';

interface LightSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Light-themed sibling of `CustomSelect` (which is hardcoded dark) for the new onboarding wizard. */
export function LightSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
}: LightSelectProps) {
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
        const menu = document.getElementById('smart-light-select-menu');
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
    <div
      className={`relative w-full border border-border rounded-xl px-4 py-3 bg-muted ${className}`}
      ref={containerRef}
    >
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="w-full flex items-center justify-between text-left focus:outline-none h-full"
      >
        <span
          className={
            selectedOption
              ? 'text-foreground font-medium truncate'
              : 'text-muted-foreground truncate'
          }
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 ml-2 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#00fad0]' : 'text-muted-foreground'}`}
        />
      </button>

      {typeof document !== 'undefined' &&
        isOpen &&
        createPortal(
          <div
            id="smart-light-select-menu"
            style={{
              position: 'fixed',
              left: menuBox.left,
              width: menuBox.width,
              zIndex: 80,
              maxHeight: menuBox.maxHeight,
              ...(menuBox.openUp ? { bottom: menuBox.bottom } : { top: menuBox.top }),
            }}
            className="bg-card border border-border rounded-xl shadow-2xl overflow-y-auto"
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
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                      isSelected
                        ? 'bg-[#00fad0]/15 text-[#00fad0] font-semibold'
                        : 'text-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
