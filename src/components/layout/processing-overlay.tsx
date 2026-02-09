'use client';

import React from 'react';

const CustomLoader = () => (
  <div className="bg-card p-6 rounded-[2rem] shadow-xl flex items-center justify-center w-32 h-32 animate-in zoom-in-95">
    <div className="relative w-16 h-16">
      {/* The "U" shape bottom arc */}
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.5s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* The side arc */}
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-40"
        />
      </svg>
    </div>
  </div>
);

export const ProcessingOverlay = ({ message }: { message: string }) => {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in-0 p-4">
      <div className="flex flex-col items-center justify-center gap-6">
        <CustomLoader />
        <p className="text-lg font-bold text-foreground mt-2 animate-pulse">{message}</p>
      </div>
    </div>
  );
};
