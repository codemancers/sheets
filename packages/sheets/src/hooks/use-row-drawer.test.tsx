import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRowDrawer } from './use-row-drawer.js';

describe('useRowDrawer', () => {
  it('opens a row, switches to another, and closes', () => {
    const { result } = renderHook(() => useRowDrawer());
    expect(result.current.openRowId).toBeNull();

    act(() => result.current.open('1'));
    expect(result.current.isOpen('1')).toBe(true);

    act(() => result.current.open('2'));
    expect(result.current.isOpen('1')).toBe(false);
    expect(result.current.openRowId).toBe('2');

    act(() => result.current.close());
    expect(result.current.openRowId).toBeNull();
  });

  it('toggles the open row closed', () => {
    const { result } = renderHook(() => useRowDrawer());

    act(() => result.current.toggle('1'));
    expect(result.current.openRowId).toBe('1');
    act(() => result.current.toggle('1'));
    expect(result.current.openRowId).toBeNull();
  });

  // e.g. an app keeping the open row in the URL
  it('leaves controlled state to the app', () => {
    const onOpenRowIdChange = vi.fn();
    const { result } = renderHook(() =>
      useRowDrawer({ openRowId: '7', onOpenRowIdChange }),
    );
    expect(result.current.isOpen('7')).toBe(true);

    act(() => result.current.close());

    expect(onOpenRowIdChange).toHaveBeenCalledWith(null);
    expect(result.current.openRowId).toBe('7');
  });

  it('keeps open and close stable across renders', () => {
    const { result, rerender } = renderHook(() => useRowDrawer());
    const { open, close } = result.current;

    rerender();

    expect(result.current.open).toBe(open);
    expect(result.current.close).toBe(close);
  });

  it('returns focus to what opened the row when it closes', () => {
    vi.useFakeTimers();
    function Harness() {
      const drawer = useRowDrawer();
      return (
        <>
          <button type="button" onClick={() => drawer.open('1')}>
            Open task
          </button>
          {drawer.openRowId && (
            <div role="dialog" aria-label="Task">
              <button type="button" autoFocus onClick={drawer.close}>
                Close
              </button>
            </div>
          )}
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open task' });

    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    act(() => vi.runAllTimers());

    expect(document.activeElement).toBe(trigger);
    vi.useRealTimers();
  });
});
