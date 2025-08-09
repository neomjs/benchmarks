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
        <div ref={tableContainerRef} style={{ overflow: 'auto', height: '100%', width: '100%' }}>
            <table style={{ display: 'grid', width: '100%' }}>
                <thead style={{ display: 'grid', position: 'sticky', top: 0, zIndex: 1, backgroundColor: '#2a2a2a' }}>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id} style={{ display: 'flex' }}>
                            {headerGroup.headers.map(header => (
                                <th key={header.id} style={{
                                    display: 'flex',
                                    width: header.column.id === 'label' ? '100%' : header.getSize(),
                                    flex: header.column.id === 'label' ? '1 1 0' : undefined,
                                    padding: '8px',
                                    borderBottom: '1px solid #444',
                                    textAlign: 'left'
                                }}>
                                    {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody style={{ display: 'grid', height: `${totalSize}px`, position: 'relative' }}>
                    {virtualRows.map(virtualRow => {
                        const row = rows[virtualRow.index];
                        return (
                            <tr key={row.id} style={{
                                display: 'flex',
                                position: 'absolute',
                                transform: `translateY(${virtualRow.start}px)`,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                            }}>
                                {row.getVisibleCells().map(cell => (
                                    <td key={cell.id} style={{
                                        display: 'flex',
                                        width: cell.column.id === 'label' ? '100%' : cell.column.getSize(),
                                        flex: cell.column.id === 'label' ? '1 1 0' : undefined,
                                        padding: '8px',
                                    }}>
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
    );
};

export default Grid;