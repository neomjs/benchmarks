import { useState, useCallback, useMemo } from 'react';
import './App.css';
import Controls from './Controls';
import Grid from './Grid';
import { generateDataAsync } from './data.jsx';

// Function to generate column definitions
const generateColumns = (amountColumns) => {
  const columns = [
    { field: 'id', headerName: '#', width: 60 },
    { field: 'firstname', headerName: 'Firstname', width: 150, filter: true, suppressHeaderFilterButton: true },
    { field: 'lastname', headerName: 'Lastname', width: 150, filter: true, suppressHeaderFilterButton: true },
    {
      field: 'countAction',
      headerName: 'Increase Counter',
      width: 150,
      cellRenderer: (params) => {
        const onClick = () => {
          params.node.setDataValue('counter', params.data.counter + 1);
        };
        return <button onClick={onClick}>{params.data.firstname} ++</button>;
      },
    },
    { field: 'counter', headerName: 'Counter', width: 100 },
    {
      field: 'progress',
      headerName: 'Progress',
      width: 150,
      cellRenderer: (params) => (
        <div
          style={{
            width: `${params.value}%`,
            backgroundColor: '#007bff',
            height: '100%',
          }}
        ></div>
      ),
    },
  ];

  for (let i = 7; i <= amountColumns; i++) {
    columns.push({ field: 'number' + i, headerName: 'Number ' + i, width: 100 });
  }

  return columns;
};

function App() {
  const [allData, setAllData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [theme, setTheme] = useState('alpine-dark');
  const [firstnameFilter, setFirstnameFilter] = useState('');
  const [lastnameFilter, setLastnameFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState('row');
  const [rowSelectionType, setRowSelectionType] = useState('single');
  const [bufferRowRange, setBufferRowRange] = useState(5);
  const [bufferColumnRange, setBufferColumnRange] = useState(3);
  const [loading, setLoading] = useState(false);
  const [actualFilteredRowCount, setActualFilteredRowCount] = useState(0);

  const [showControls, setShowControls] = useState(false);

  const handleDataConfigChange = useCallback(async (config) => {
    setLoading(true);
    const { amountRows, amountColumns, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange } = config;
    const data = await generateDataAsync(amountRows, amountColumns);
    const newColumns = generateColumns(amountColumns);
    setAllData(data);
    setColumns(newColumns);
    setTheme(theme);
    setSelectionModel(selectionModel);
    setRowSelectionType(rowSelectionType);
    setBufferRowRange(bufferRowRange);
    setBufferColumnRange(bufferColumnRange);
    setLoading(false);
  }, []);

  const handleFilterChange = useCallback((filters) => {
    setFirstnameFilter(filters.firstnameFilter);
    setLastnameFilter(filters.lastnameFilter);
  }, []);

  const handleFilteredRowsChanged = useCallback((count) => {
    setActualFilteredRowCount(count);
  }, []);

  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  return (
    <div className="App">
      <button className={`hamburger-button ${showControls ? 'shifted' : ''}`} onClick={handleToggleControls}>
        ☰
      </button>
      <div className={`controls-panel ${showControls ? 'open' : 'closed'}`}>
        <Controls
          onDataConfigChange={handleDataConfigChange}
          onFilterChange={handleFilterChange}
          filteredRowCount={actualFilteredRowCount}
        />
      </div>
      <div className="grid-container">
        <Grid
          className="main-grid"
          rowData={allData}
          columnDefs={columns}
          theme={theme}
          selectionModel={selectionModel}
          rowSelectionType={rowSelectionType}
          bufferRowRange={bufferRowRange}
          bufferColumnRange={bufferColumnRange}
          loading={loading}
          firstnameFilter={firstnameFilter}
          lastnameFilter={lastnameFilter}
          onFilteredRowsChanged={handleFilteredRowsChanged}
        />
      </div>
    </div>
  );
}

export default App;
