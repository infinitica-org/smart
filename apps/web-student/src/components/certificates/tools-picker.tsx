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
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1.5 text-xs font-medium text-foreground"
            >
              {tool}
              <button
                type="button"
                onClick={() => removeTool(tool)}
                disabled={disabled}
                className="text-muted-foreground/60 hover:text-muted-foreground"
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
          className="flex-1 rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={addTool}
          disabled={disabled}
          className="inline-flex h-[42px] items-center gap-1.5 rounded-xl border border-border px-4 text-sm text-foreground/80 hover:bg-muted"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}
