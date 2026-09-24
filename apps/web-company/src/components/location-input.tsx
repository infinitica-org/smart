'use client';

import { useEffect, useId, useState } from 'react';
import { searchLocations } from '../lib/location-search';

interface LocationInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/** Free-text location field with place suggestions; typing anything still works without them. */
export function LocationInput({ id, value, onChange, className, placeholder }: LocationInputProps) {
  const listId = useId();
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      void searchLocations(value).then((names) => {
        if (active) setOptions(names);
      });
    }, 400);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value]);

  return (
    <>
      <input
        id={id}
        type="text"
        list={listId}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={className}
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  );
}
