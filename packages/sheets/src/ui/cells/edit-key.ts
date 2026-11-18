import type { KeyboardEvent } from 'react';

/**
 * Opens a focused cell's editor from the keyboard, as in a spreadsheet: a
 * typed character replaces the value, and F2 keeps it. Enter and Space already
 * open the editor, since the cell is a button, so Space is not taken as a typed
 * character. Other keys are left alone.
 */
export function editOnKey(
  event: KeyboardEvent,
  start: (draft?: string) => void,
) {
  if (event.key === 'F2') {
    event.preventDefault();
    start();
    return;
  }
  // An input method composes its text in the editor once it's open.
  if (event.nativeEvent.isComposing || event.keyCode === 229) return;
  // Shortcuts. Ctrl with Alt is AltGr on Windows, which types @ and €.
  if (event.metaKey || (event.ctrlKey && !event.altKey)) return;
  if (event.key.length !== 1 || event.key === ' ') return;
  event.preventDefault();
  start(event.key);
}
