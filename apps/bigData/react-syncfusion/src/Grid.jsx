import { useEffect, useRef } from 'react';
import { ColumnDirective, ColumnsDirective, GridComponent, Inject, Sort, Filter, Resize } from '@syncfusion/ej2-react-grids';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-calendars/styles/material.css';
import '@syncfusion/ej2-dropdowns/styles/material.css';
import '@syncfusion/ej2-inputs/styles/material.css';
import '@syncfusion/ej2-navigations/styles/material.css';
import '@syncfusion/ej2-popups/styles/material.css';
import '@syncfusion/ej2-splitbuttons/styles/material.css';
import '@syncfusion/ej2-react-grids/styles/material.css';

function Grid({ rowData, columnDefs, selectionModel, rowSelectionType, loading, firstnameFilter, lastnameFilter, onFilteredRowsChanged }) {
  const gridRef = useRef(null);

  const selectionSettings = {
    type: selectionModel === 'row' ? 'Multiple' : 'Cell',
    mode: rowSelectionType === 'single' ? 'Row' : 'Row',
  };

  useEffect(() => {
    if (gridRef.current) {
      if (loading) {
        gridRef.current.showSpinner();
      } else {
        gridRef.current.hideSpinner();
      }
    }
  }, [loading]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.filterByColumn('firstname', 'contains', firstnameFilter);
    }
  }, [firstnameFilter]);

  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.filterByColumn('lastname', 'contains', lastnameFilter);
    }
  }, [lastnameFilter]);

  const actionComplete = (args) => {
    if (args.requestType === 'filtering' && onFilteredRowsChanged) {
      onFilteredRowsChanged(gridRef.current.getFilteredRecords().length);
    }
  };

  return (
    <GridComponent
      ref={gridRef}
      dataSource={rowData}
      allowPaging={false}
      allowSorting={true}
      allowFiltering={true}
      allowGrouping={false}
      allowResizing={true}
      allowScrolling={true}
      height="100%"
      width="100%"
      selectionSettings={selectionSettings}
      filterSettings={{ type: 'Excel' }}
      actionComplete={actionComplete}
    >
      <ColumnsDirective>
        {columnDefs.map(col => <ColumnDirective key={col.field} {...col} />)}
      </ColumnsDirective>
      <Inject services={[Sort, Filter, Resize]} />
    </GridComponent>
  );
}

export default Grid;