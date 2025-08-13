import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css'; // Core grid CSS
import 'ag-grid-community/styles/ag-theme-alpine.css'; // Light & Dark Theme

function Grid({ rowData, columnDefs, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange }) {
  const defaultColDef = {
    resizable: true,
    sortable: true,
    filter: true,
  };

  return (
    <div className={`ag-theme-${theme}`} style={{ height: '100%', width: '100%' }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        rowSelection={selectionModel === 'row' ? rowSelectionType : undefined}
        suppressRowClickSelection={selectionModel === 'cell'}
        enableCellTextSelection={selectionModel === 'cell'}
        rowBuffer={bufferRowRange}
        columnBuffer={bufferColumnRange}
        // enableCellTextSelection={true}
        // ensureDomOrder={true}
        // suppressColumnVirtualisation={true}
        // suppressRowVirtualisation={true}
      />
    </div>
  );
}

export default Grid;
