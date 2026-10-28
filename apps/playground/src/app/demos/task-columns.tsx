import { defineSheetColumn } from '@codemancers/sheets';
import { SheetPrimaryCell, SheetTextCell } from '@codemancers/sheets/ui';
import type { Task } from '../data';

/** Read-only task columns shared by the sorting and 1,000-row demos. */
export function taskColumns(onOpen: (task: Task) => void) {
  return [
    defineSheetColumn<Task>({
      id: 'title',
      header: 'Title',
      accessor: 'title',
      width: 300,
      sortable: true,
      cell: ({ row }) => (
        <SheetPrimaryCell
          href={`#task-${row.id}`}
          detailHref={`#task-${row.id}/details`}
          onOpenDrawer={() => onOpen(row.original)}
        >
          {row.original.title}
        </SheetPrimaryCell>
      ),
    }),
    defineSheetColumn<Task>({
      id: 'status',
      header: 'Status',
      accessor: 'status',
      cell: ({ getValue }) => (
        <SheetTextCell muted>{String(getValue())}</SheetTextCell>
      ),
    }),
    defineSheetColumn<Task>({
      id: 'owner',
      header: 'Owner',
      accessor: 'owner',
      sortable: true,
      cell: ({ getValue }) => (
        <SheetTextCell>{String(getValue())}</SheetTextCell>
      ),
    }),
    defineSheetColumn<Task>({
      id: 'due',
      header: 'Due',
      accessor: 'due',
      width: 120,
      sortable: true,
      cell: ({ getValue }) => (
        <SheetTextCell>{String(getValue())}</SheetTextCell>
      ),
    }),
  ];
}
