import { AgGridReact } from 'ag-grid-react';
import { useRef } from 'react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Light & Dark Theme

function Grid({ rowData, columnDefs, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange, loading }) {
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
      />
    </div>
  );
}

export default Grid;