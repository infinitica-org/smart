'use client';

import React from 'react';

export default function ScrollSlideshow({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full relative bg-bg">
      {React.Children.map(children, (child, index) => (
        <div key={index} className="w-full relative bg-bg z-10">
          {child}
        </div>
      ))}
    </div>
  );
}
