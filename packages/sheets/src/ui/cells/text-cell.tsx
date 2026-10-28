import { cx } from '../cx.js';
import type { ReactNode } from 'react';

export type SheetTextCellProps = {
  children?: ReactNode;
  className?: string;
  muted?: boolean;
};

export function SheetTextCell({
  children,
  className,
  muted,
}: SheetTextCellProps) {
  return (
    <div
      className={cx(
        'block w-full truncate px-2 py-1.5 text-sm',
        muted
          ? 'text-sheet-muted dark:text-sheet-muted-dark'
          : 'text-sheet-fg dark:text-sheet-fg-dark',
        className,
      )}
    >
      {children}
    </div>
  );
}
