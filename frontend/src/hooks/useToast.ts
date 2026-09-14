import { useState, useCallback } from 'react';

export const useToast = (defaultDurationMs = 3000) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback(
    (msg: string, durationMs = defaultDurationMs) => {
      setToastMessage(msg);
      setTimeout(() => {
        setToastMessage(null);
      }, durationMs);
    },
    [defaultDurationMs]
  );

  const clearToast = useCallback(() => {
    setToastMessage(null);
  }, []);

  return { toastMessage, showToast, clearToast };
};

export default useToast;
