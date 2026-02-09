'use client';

import React from 'react';

const CustomLoader = () => (
  <div className="bg-card/90 p-4 rounded-3xl shadow-2xl flex items-center justify-center w-24 h-24 animate-in zoom-in-95 border border-white/10">
    <div className="relative w-12 h-12">
      <svg
        viewBox="0 0 50 50"
        className="absolute inset-0 w-full h-full animate-spin"
        style={{ animationDuration: '1.2s' }}
      >
        <path
          d="M15 25 A10 10 0 0 0 35 25"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M40 15 A15 15 0 0 1 40 35"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="5"
          strokeLinecap="round"
          className="opacity-30"
        />
      </svg>
    </div>
  </div>
);

export const ProcessingOverlay = ({ message }: { message: string }) => {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-[100] flex items-center justify-center animate-in fade-in-0 p-4">
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <CustomLoader />
        <p className="text-sm font-bold text-white drop-shadow-md animate-pulse">{message}</p>
      </div>
    </div>
  );
};
