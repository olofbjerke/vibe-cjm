import { useEffect, useRef, useCallback } from 'react';

interface UseAutoSaveOptions {
  delay?: number; // Debounce delay in milliseconds
  onSave?: () => void; // Callback when save occurs
}

export function useAutoSave(
  data: unknown,
  saveFunction: () => void,
  options: UseAutoSaveOptions = {}
) {
  const { delay = 1000, onSave } = options;
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const lastDataRef = useRef(data);
  const saveRef = useRef(saveFunction);

  // Update refs when dependencies change
  useEffect(() => {
    saveRef.current = saveFunction;
  }, [saveFunction]);

  const debouncedSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      saveRef.current();
      onSave?.();
    }, delay);
  }, [delay, onSave]);

  useEffect(() => {
    // Only save if data has actually changed
    if (JSON.stringify(data) !== JSON.stringify(lastDataRef.current)) {
      lastDataRef.current = data;
      debouncedSave();
    }

    // Cleanup timeout on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, debouncedSave]);

  // Force immediate save
  const forceSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    saveRef.current();
    onSave?.();
  }, [onSave]);

  // Cancel pending save
  const cancelSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { forceSave, cancelSave };
}