import type { Table } from '@tanstack/react-table';
import { SheetColumn } from './sheet-column.js';
import { SheetRowNumber } from './sheet-row-number.js';
import { SheetSpacerColumn } from './sheet-spacer-column.js';

export type SheetHeaderProps<TData> = {
  table: Table<TData>;
  gridTemplateColumns: string;
};

export function SheetHeader<TData>({
  table,
  gridTemplateColumns,
}: SheetHeaderProps<TData>) {
  return (
    <div
      role="rowgroup"
      className="sticky top-0 z-10 bg-white dark:bg-zinc-900"
    >
      {table.getHeaderGroups().map((headerGroup) => (
        <div
          key={headerGroup.id}
          role="row"
          className="grid"
          style={{ gridTemplateColumns }}
        >
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
