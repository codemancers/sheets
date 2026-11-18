import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useInlineEdit } from './use-inline-edit.js';

/** A cell built on the hook, as an app's own editable cell would be. */
function Cell({ type }: { type: 'text' | 'number' }) {
  const { isEditing, beginEdit, triggerRef, inputProps } = useInlineEdit({
    value: '42',
  });
  if (isEditing)
    return <input type={type} aria-label="Amount" {...inputProps} />;
  return (
    <button ref={triggerRef} type="button" onClick={() => beginEdit()}>
      42
    </button>
  );
}

describe('useInlineEdit', () => {
  it('opens with the caret after the text', () => {
    render(<Cell type="text" />);

    fireEvent.click(screen.getByRole('button', { name: '42' }));

    const input = screen.getByRole<HTMLInputElement>('textbox');
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(2);
  });

  // A number input has no caret, and placing one throws. The throw happens in
  // a focus handler, which reports it as an uncaught error rather than failing
  // the render, so listen for that.
  it('opens a number input without placing a caret', () => {
    const errors: unknown[] = [];
    const onError = (event: ErrorEvent) => {
      errors.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);
    try {
      render(<Cell type="number" />);
      fireEvent.click(screen.getByRole('button', { name: '42' }));
    } finally {
      window.removeEventListener('error', onError);
    }

    expect(errors).toEqual([]);
    expect(screen.getByRole('spinbutton', { name: 'Amount' })).toBeTruthy();
  });
});
