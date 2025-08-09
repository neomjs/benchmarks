import React from 'react';
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

const Grid = ({ data }) => {
    const columns = React.useMemo(
        () => [
            {
                accessorKey: 'id',
                header: 'ID',
                size: 60,
            },
            {
                accessorKey: 'label',
                header: 'Label',
            },
        ],
        []
    );

    const table = useReactTable({
        data,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const tableContainerRef = React.useRef(null);

    const { rows } = table.getRowModel();
    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => 35,
        overscan: 10,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();

    return (
        <div ref={tableContainerRef} className="table-container" style={{ overflow: 'auto', height: '500px' }}>
            <div style={{ height: `${totalSize}px`, position: 'relative' }}>
                <table>
                    <thead>
                        {table.getHeaderGroups().map(headerGroup => (
                            <tr key={headerGroup.id}>
                                {headerGroup.headers.map(header => (
                                    <th key={header.id} style={{ width: header.getSize() }}>
                                        {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                        )}
                                    </th>

                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {virtualRows.map(virtualRow => {
                            const row = rows[virtualRow.index];
                            return (
                                <tr key={row.id} style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: `${virtualRow.size}px`,
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}>
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id}>
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Grid;