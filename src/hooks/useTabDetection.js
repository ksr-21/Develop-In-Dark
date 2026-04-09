import { useState, useEffect, useCallback } from 'react';

export default function useTabDetection() {
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          return newCount;
        });
        setShowWarning(true);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const dismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return { tabSwitchCount, showWarning, dismissWarning };
}
