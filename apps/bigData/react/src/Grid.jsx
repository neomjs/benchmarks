import { AgGridReact } from 'ag-grid-react';
import { useRef, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Light & Dark Theme

function Grid({ rowData, columnDefs, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange, loading }) {
  const gridRef = useRef(null);

  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  useEffect(() => {
    if (gridRef.current && gridRef.current.api) {
      if (loading) {
        gridRef.current.api.showLoadingOverlay();
      } else {
        gridRef.current.api.hideOverlay();
      }
    }
  }, [loading]);

  return (
    <div className={`ag-theme-${theme}`} style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        ref={gridRef}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={selectionModel === 'row' ? rowSelectionType : undefined}
        suppressRowClickSelection={selectionModel === 'cell'}
        enableCellTextSelection={selectionModel === 'cell'}
        rowBuffer={bufferRowRange}
        columnBuffer={bufferColumnRange}
      />
    </div>
  );
}

export default Grid;