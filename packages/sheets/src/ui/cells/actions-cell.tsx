import { cx } from '../cx.js';
import type { ReactNode } from 'react';

export type SheetActionsCellProps = {
  children?: ReactNode;
  className?: string;
};

export function SheetActionsCell({
  children,
  className,
}: SheetActionsCellProps) {
  return (
    <div
      className={cx('flex w-full items-center gap-1 px-2 py-1.5', className)}
    >
      {children}
    </div>
  );
}
