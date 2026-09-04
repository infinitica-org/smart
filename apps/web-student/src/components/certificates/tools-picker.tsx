'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';

interface ToolsPickerProps {
  tools: string[];
  onChange: (tools: string[]) => void;
  disabled?: boolean;
}

/**
 * Freeform tag input — deliberately NOT constrained to any catalog, unlike
 * `SkillDiscovery`'s taxonomy-only picker. "Tools" (AWS Console, Figma, ...)
 * has no closed taxonomy in this codebase to constrain against.
 */
export function ToolsPicker({ tools, onChange, disabled }: ToolsPickerProps) {
  const [input, setInput] = useState('');

  const addTool = () => {
    const trimmed = input.trim();
    if (!trimmed || tools.some((tool) => tool.toLowerCase() === trimmed.toLowerCase())) {
      setInput('');
      return;
    }
    onChange([...tools, trimmed]);
    setInput('');
  };

  const removeTool = (tool: string) => onChange(tools.filter((t) => t !== tool));

  return (
    <div className="flex flex-col gap-2">
      {tools.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-white"
            >
              {tool}
              <button
                type="button"
                onClick={() => removeTool(tool)}
                disabled={disabled}
                className="text-white/30 hover:text-white/70"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          disabled={disabled}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addTool();
            }
          }}
          placeholder="Add a tool or technology (e.g. AWS Console)"
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-[#00fad0]/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={addTool}
          disabled={disabled}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-xl border border-white/15 px-4 text-sm text-white/80 hover:bg-white/5"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}
