import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'

export function DataTable({ columns, data, initialSorting = [] }) {
  const table = useReactTable({
    data: useMemo(() => data ?? [], [data]),
    columns,
    state: { sorting: initialSorting },
    onSortingChange: () => {},
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border rounded-md">
        <thead className="bg-gray-50">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th
                  key={header.id}
                  className="px-3 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="border-t">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="px-3 py-2 text-sm">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


