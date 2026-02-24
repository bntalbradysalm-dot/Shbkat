'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { errorEmitter } from '@/firebase/error-emitter';

/**
 * A global error dialog that follows the specific UI requested by the user.
 * It listens for 'custom-error' events from the global errorEmitter.
 */
export function AppErrorDialog() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (message: string) => {
      setErrorMessage(message);
    };

    errorEmitter.on('custom-error', handleError);
    return () => errorEmitter.off('custom-error', handleError);
  }, []);

  const handleClose = () => {
    setErrorMessage(null);
  };

  return (
    <Dialog open={!!errorMessage} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-[85vw] sm:max-w-[350px] p-8 rounded-[40px] border-none shadow-2xl flex flex-col items-center text-center z-[10000] outline-none [&>button]:hidden">
        {/* The requested orange 'i' icon */}
        <div className="w-20 h-20 rounded-full border-[6px] border-[#FEA500] flex items-center justify-center mb-6 shadow-sm">
          <span className="text-5xl font-black text-[#FEA500] leading-none select-none">i</span>
        </div>
        
        {/* Error Message */}
        <p className="text-base font-bold text-foreground mb-8 leading-relaxed">
          {errorMessage}
        </p>
        
        {/* OK Button with App Mesh Gradient */}
        <Button 
          onClick={handleClose}
          className="w-full h-14 rounded-full bg-mesh-gradient text-white font-black text-lg shadow-lg active:scale-95 transition-all border-none"
        >
          موافق
        </Button>
      </DialogContent>
    </Dialog>
  );
}
