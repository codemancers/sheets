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
};

export function useInlineEdit<T extends string>({
  value,
  onCommit,
  onCancel,
  autoFocus = false,
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
    if (draft !== value) {
      await onCommit?.(draft);
    }
  }, [draft, value, onCommit]);

  const cancel = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    setDraft(value);
    setIsEditing(false);
    onCancel?.();
  }, [value, onCancel]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
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
