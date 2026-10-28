import {
  type FocusEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

export type UseInlineEditOptions<T> = {
  value: T;
  onCommit?: (next: T) => void | Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
  /**
   * The value shown is not saved yet (a refused or staged edit). Committing it
   * unchanged then still calls onCommit: that is how a refused value is
   * retried.
   */
  dirty?: boolean;
};

export function useInlineEdit<T extends string>({
  value,
  onCommit,
  onCancel,
  autoFocus = false,
  dirty = false,
}: UseInlineEditOptions<T>) {
  const [draft, setDraft] = useState<T>(value);
  const [isEditing, setIsEditing] = useState(autoFocus);
  const committedRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  const beginEdit = useCallback(() => {
    committedRef.current = false;
    setDraft(value);
    setIsEditing(true);
  }, [value]);

  const commit = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setIsEditing(false);
    if (dirty || draft !== value) {
      await onCommit?.(draft);
    }
  }, [draft, value, onCommit, dirty]);

  const cancel = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    setDraft(value);
    setIsEditing(false);
    onCancel?.();
  }, [value, onCancel]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      // An IME (Japanese, Chinese, Korean input) confirms its composition
      // with Enter; that keypress belongs to the IME, not the cell. Safari
      // reports it as keyCode 229 rather than through isComposing.
      if (event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      } else if (event.key === 'Tab') {
        void commit();
      }
    },
    [commit, cancel],
  );

  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      void commit();
    },
    [commit],
  );

  return {
    isEditing,
    draft,
    setDraft,
    beginEdit,
    commit,
    cancel,
    inputProps: {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft(e.target.value as T),
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      autoFocus,
    },
  };
}
