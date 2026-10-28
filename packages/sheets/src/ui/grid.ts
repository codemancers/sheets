import type { CSSProperties } from 'react';

/**
 * Header, body and footer rows lay out on the column tracks the Sheet root
 * sets as --sheet-columns. Resizing a column then updates one variable on the
 * root instead of a prop on every row.
 */
export const sheetGrid: CSSProperties = {
  gridTemplateColumns: 'var(--sheet-columns)',
};
