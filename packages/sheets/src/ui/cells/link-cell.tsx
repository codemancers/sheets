import { cx } from '../cx.js';
import type { ReactNode } from 'react';

export type SheetLinkCellProps = {
  href: string;
  children?: ReactNode;
  className?: string;
  LinkComponent?: React.ComponentType<{
    href: string;
    className?: string;
    children?: ReactNode;
  }>;
};

function DefaultLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export function SheetLinkCell({
  href,
  children,
  className,
  LinkComponent = DefaultLink,
}: SheetLinkCellProps) {
  return (
    <LinkComponent
      href={href}
      className={cx(
        'block w-full truncate px-2 py-1.5 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300',
        className,
      )}
    >
      {children}
    </LinkComponent>
  );
}
