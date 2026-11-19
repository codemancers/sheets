'use client';

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
  /**
   * The edit ended with nothing to save: Escape, or Enter or blur with the
   * value unchanged. A new row uses it to remove itself.
   */
  onCancel?: () => void;
  /** Start in edit mode, e.g. for the first cell of a newly added row. */
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
  // The element that opens the editor. Enter and Escape close it from the
  // keyboard, and focus goes back here rather than dropping to <body>.
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const refocusRef = useRef(false);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (!isEditing && refocusRef.current) {
      refocusRef.current = false;
      triggerRef.current?.focus();
    }
  }, [isEditing]);

  /**
   * Opens the editor on the value, or on `draft` instead, such as the key typed
   * into a focused cell. Anything else passed in, like the click event from
   * `onClick={beginEdit}`, is ignored.
   */
  const beginEdit = useCallback(
    (draft?: T) => {
      committedRef.current = false;
      setDraft(typeof draft === 'string' ? draft : value);
      setIsEditing(true);
    },
    [value],
  );

  const commit = useCallback(async () => {
    if (committedRef.current) return;
    committedRef.current = true;
    setIsEditing(false);
    if (dirty || draft !== value) {
      await onCommit?.(draft);
    } else {
      // Nothing to save ends the edit the way Escape does, so a new row that
      // was never filled in goes away rather than sitting there empty.
      onCancel?.();
    }
  }, [draft, value, onCommit, onCancel, dirty]);

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
        refocusRef.current = true;
        void commit();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        refocusRef.current = true;
        cancel();
      }
      // Tab is left to the browser: focus moves on to the next cell, and the
      // blur that follows commits. Committing on keydown removed the input
      // first, and focus landed back on this cell instead.
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
    /** Attach to the element that opens the editor. */
    triggerRef,
    /**
     * For the editor input. It takes focus on mount, so render it only while
     * `isEditing`: a click that opens the editor can then type straight away.
     */
    inputProps: {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
        setDraft(e.target.value as T),
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      // The caret goes after the text, so typing carries on from a typed first
      // key in every browser, rather than landing in front of it.
      // Number, email and date inputs have no caret to place: setting one throws.
      onFocus: (e: FocusEvent<HTMLInputElement>) => {
        if (e.currentTarget.selectionStart === null) return;
        const end = e.currentTarget.value.length;
        e.currentTarget.setSelectionRange(end, end);
      },
      autoFocus: true,
    },
  };
}
