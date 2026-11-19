import type { RowData, Table } from '@tanstack/react-table';
import type { SheetFeatures } from '../hooks/use-sheet.js';
import { SheetColumn } from './sheet-column.js';
import { SheetRowNumber } from './sheet-row-number.js';
import { SheetSpacerColumn } from './sheet-spacer-column.js';
import { sheetGrid } from './grid.js';

export type SheetHeaderProps<TData extends RowData> = {
  table: Table<SheetFeatures, TData>;
};

export function SheetHeader<TData extends RowData>({
  table,
}: SheetHeaderProps<TData>) {
  return (
    <div
      role="rowgroup"
      className="sticky top-0 z-10 bg-sheet-bg dark:bg-sheet-bg-dark"
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <div key={headerGroup.id} role="row" className="grid" style={sheetGrid}>
          <SheetRowNumber isHeader />
          {headerGroup.headers.map((header, idx) => (
            <SheetColumn
              key={header.id}
              header={header}
              isFirstCol={idx === 0}
            />
          ))}
          <SheetSpacerColumn isHeader />
        </div>
      ))}
    </div>
  );
}
