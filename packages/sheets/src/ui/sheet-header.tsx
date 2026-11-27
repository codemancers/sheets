'use client';

import { useRef } from 'react';
import type { RowData, Table } from '@tanstack/react-table';
import type { SheetFeatures } from '../hooks/use-sheet.js';
import { SheetColumn } from './sheet-column.js';
import { DraggedColumnContext } from './sheet-column-move.js';
import { SheetRowNumber } from './sheet-row-number.js';
import { SheetSpacerColumn } from './sheet-spacer-column.js';
import { sheetGrid } from './grid.js';

export type SheetHeaderProps<TData extends RowData> = {
  table: Table<SheetFeatures, TData>;
  /** Lets people move columns, as `Sheet`'s prop of the same name does. */
  enableColumnOrdering?: boolean;
};

export function SheetHeader<TData extends RowData>({
  table,
  enableColumnOrdering,
}: SheetHeaderProps<TData>) {
  // One per header, so a column dragged in one sheet can't land in another.
  const dragged = useRef<string | null>(null);
  return (
    <DraggedColumnContext.Provider value={dragged}>
      <div
        role="rowgroup"
        className="sticky top-0 z-10 bg-sheet-bg dark:bg-sheet-bg-dark"
      >
        {table.getHeaderGroups().map((headerGroup) => (
          <div
            key={headerGroup.id}
            role="row"
            className="grid"
            style={sheetGrid}
          >
            <SheetRowNumber isHeader />
            {headerGroup.headers.map((header, idx) => (
              <SheetColumn
                key={header.id}
                header={header}
                isFirstCol={idx === 0}
                enableColumnOrdering={enableColumnOrdering}
              />
            ))}
            <SheetSpacerColumn isHeader />
          </div>
        ))}
      </div>
    </DraggedColumnContext.Provider>
  );
}
