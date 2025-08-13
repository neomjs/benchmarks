import { AgGridReact } from 'ag-grid-react';
import { useRef, useEffect, useCallback } from 'react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Light & Dark Theme

function Grid({ rowData, columnDefs, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange, loading, firstnameFilter, lastnameFilter, onFilteredRowsChanged }) {
  const gridRef = useRef(null);

  const defaultColDef = {
    resizable: false,
    sortable: true
  };

  let rowSelectionMode = undefined; // Default to undefined
  let enableClickSelection = true; // Default to true
  let rowSelectionCheckboxes = false; // Default to false

  if (selectionModel === 'row') {
    rowSelectionMode = rowSelectionType === 'single' ? 'singleRow' : 'multipleRow';
    enableClickSelection = true; // Allow click selection for row selection
    rowSelectionCheckboxes = false; // Explicitly disable checkboxes for row selection
  } else if (selectionModel === 'cell') {
    // For cell selection, we want to disable row click selection
    rowSelectionMode = undefined; // No specific row selection mode for cell selection
    enableClickSelection = false; // Disable row click selection for cell selection
    rowSelectionCheckboxes = false; // Explicitly disable checkboxes for cell selection
  }

  const onGridReady = useCallback((params) => {
    onFilteredRowsChanged(params.api.getDisplayedRowCount());
  }, [onFilteredRowsChanged]);

  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      const filterModel = {};
      if (firstnameFilter) {
        filterModel.firstname = {
          filterType: 'text',
          type: 'contains',
          filter: firstnameFilter,
        };
      }
      if (lastnameFilter) {
        filterModel.lastname = {
          filterType: 'text',
          type: 'contains',
          filter: lastnameFilter,
        };
      }
      gridRef.current.api.setFilterModel(filterModel);
      onFilteredRowsChanged(gridRef.current.api.getDisplayedRowCount());
    }
  }, [firstnameFilter, lastnameFilter, onFilteredRowsChanged]);

  return (
    <div className={`ag-theme-${theme}`} style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={rowSelectionMode ? { mode: rowSelectionMode, checkboxes: rowSelectionCheckboxes } : undefined}
        enableClickSelection={enableClickSelection}
        enableCellTextSelection={selectionModel === 'cell'}
        rowBuffer={bufferRowRange}
        columnBuffer={bufferColumnRange}
        loading={loading} // Pass loading prop directly
        onGridReady={onGridReady}
      />
    </div>
  );
}

export default Grid;
