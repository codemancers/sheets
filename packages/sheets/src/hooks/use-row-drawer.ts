'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

export type UseRowDrawerOptions = {
  /**
   * The open row's id, when the app holds the state — for example in the
   * URL (`?open=<id>`), so an open drawer survives a refresh and can be
   * shared. `null` means closed.
   */
  openRowId?: string | null;
  /** Called whenever a row is opened or the drawer is closed. */
  onOpenRowIdChange?: (rowId: string | null) => void;
  /** The row open at first, when the hook holds the state. */
  defaultOpenRowId?: string | null;
};

/**
 * Which row is open in a drawer, side panel or dialog — the state, not the
 * UI. Render your own drawer from `openRowId`, call `open` from the row's
 * trigger (such as `SheetPrimaryCell`'s `onOpen`), and pass `openRowId` to
 * `<Sheet>` to mark the open row.
 *
 * Closing returns focus to whatever opened the row, so keyboard users land
 * back where they were.
 */
export function useRowDrawer({
  openRowId: controlledRowId,
  onOpenRowIdChange,
  defaultOpenRowId = null,
}: UseRowDrawerOptions = {}) {
  const [ownRowId, setOwnRowId] = useState(defaultOpenRowId);
  const isControlled = controlledRowId !== undefined;
  const openRowId = isControlled ? controlledRowId : ownRowId;

  // Read through refs, so open and close keep one identity across renders.
  const isControlledRef = useRef(isControlled);
  isControlledRef.current = isControlled;
  const openRowIdRef = useRef(openRowId);
  openRowIdRef.current = openRowId;
  const onChangeRef = useRef(onOpenRowIdChange);
  onChangeRef.current = onOpenRowIdChange;
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const change = useCallback((rowId: string | null) => {
    if (!isControlledRef.current) setOwnRowId(rowId);
    onChangeRef.current?.(rowId);
  }, []);

  const open = useCallback(
    (rowId: string) => {
      if (document.activeElement instanceof HTMLElement) {
        returnFocusRef.current = document.activeElement;
      }
      change(rowId);
    },
    [change],
  );

  const close = useCallback(() => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    change(null);
    // After the drawer has rendered away, if what opened it is still there.
    setTimeout(() => {
      if (target?.isConnected) target.focus();
    });
  }, [change]);

  const toggle = useCallback(
    (rowId: string) => (openRowIdRef.current === rowId ? close() : open(rowId)),
    [close, open],
  );

  const isOpen = useCallback(
    (rowId: string) => openRowId === rowId,
    [openRowId],
  );

  return useMemo(
    () => ({ openRowId, isOpen, open, close, toggle }),
    [openRowId, isOpen, open, close, toggle],
  );
}

export type RowDrawerState = ReturnType<typeof useRowDrawer>;
