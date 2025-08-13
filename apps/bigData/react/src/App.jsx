import { useState, useCallback, useMemo } from 'react';
import './App.css';
import Controls from './Controls';
import Grid from './Grid';
import { generateData } from './data.jsx';

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

  const [showControls, setShowControls] = useState(false);

  const handleConfigChange = useCallback((config) => {
    const { amountRows, amountColumns, theme, firstnameFilter, lastnameFilter, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange } = config;
    const { data, columns } = generateData(amountRows, amountColumns);
    setAllData(data);
    setColumns(columns);
    setTheme(theme);
    setFirstnameFilter(firstnameFilter);
    setLastnameFilter(lastnameFilter);
    setSelectionModel(selectionModel);
    setRowSelectionType(rowSelectionType);
    setBufferRowRange(bufferRowRange);
    setBufferColumnRange(bufferColumnRange);
  }, []);

  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const filteredData = useMemo(() => {
    let currentData = allData;

    if (firstnameFilter) {
      currentData = currentData.filter(row =>
        row.firstname.toLowerCase().includes(firstnameFilter.toLowerCase())
      );
    }

    if (lastnameFilter) {
      currentData = currentData.filter(row =>
        row.lastname.toLowerCase().includes(lastnameFilter.toLowerCase())
      );
    }

    return currentData;
  }, [allData, firstnameFilter, lastnameFilter]);

  return (
    <div className="App">
      <button className={`hamburger-button ${showControls ? 'shifted' : ''}`} onClick={handleToggleControls}>
        ☰
      </button>
      <div className={`controls-panel ${showControls ? 'open' : 'closed'}`}>
        <Controls onConfigChange={handleConfigChange} filteredRowCount={filteredData.length} />
      </div>
      <div className="grid-container">
        <Grid
          className="main-grid"
          rowData={filteredData}
          columnDefs={columns}
          theme={theme}
          selectionModel={selectionModel}
          rowSelectionType={rowSelectionType}
          bufferRowRange={bufferRowRange}
          bufferColumnRange={bufferColumnRange}
        />
      </div>
    </div>
  );
}

export default App;