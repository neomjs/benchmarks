import { useState, useCallback, useEffect } from 'react';
import './App.css';
import Controls from './Controls';
import Grid from './Grid';
import { generateDataAsync } from './data.jsx';

// Function to generate column definitions
const generateColumns = (amountColumns) => {
  const columns = [
    { field: 'id', headerText: '#', width: 60, allowFiltering: false },
    { field: 'firstname', headerText: 'Firstname', width: 150, filter: { type: 'Excel' } },
    { field: 'lastname', headerText: 'Lastname', width: 150, filter: { type: 'Excel' } },
    {
      field: 'countAction',
      headerText: 'Increase Counter',
      width: 150,
      allowFiltering: false,
      template: (props) => {
        const onClick = () => {
          // This is a placeholder. Syncfusion grid does not have a direct equivalent of AG Grid's node.setDataValue.
          // You would typically handle this by updating the state in your application.
          console.log('Increase counter for', props.firstname);
        };
        return <button onClick={onClick}>{props.firstname} ++</button>;
      },
    },
    { field: 'counter', headerText: 'Counter', width: 100, allowFiltering: false },
    {
      field: 'progress',
      headerText: 'Progress',
      width: 150,
      allowFiltering: false,
      template: (props) => (
        <div
          style={{
            width: `${props.progress}%`,
            backgroundColor: '#007bff',
            height: '100%',
          }}
        ></div>
      ),
    },
  ];

  for (let i = 7; i <= amountColumns; i++) {
    columns.push({ field: 'number' + i, headerText: 'Number ' + i, width: 100, allowFiltering: false });
  }

  return columns;
};

function App() {
  const [allData, setAllData] = useState([]);
  const [columns, setColumns] = useState(generateColumns(50));
  const [theme, setTheme] = useState('material');
  const [firstnameFilter, setFirstnameFilter] = useState('');
  const [lastnameFilter, setLastnameFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState('row');
  const [rowSelectionType, setRowSelectionType] = useState('single');
  const [loading, setLoading] = useState(false);
  const [actualFilteredRowCount, setActualFilteredRowCount] = useState(0);

  const [showControls, setShowControls] = useState(false);

  const handleDataConfigChange = useCallback(async (config) => {
    setLoading(true);
    const { amountRows, amountColumns, theme, selectionModel, rowSelectionType } = config;
    const data = await generateDataAsync(amountRows, amountColumns);
    const newColumns = generateColumns(amountColumns);
    setAllData(data);
    setColumns(newColumns);
    setTheme(theme);
    setSelectionModel(selectionModel);
    setRowSelectionType(rowSelectionType);
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

  useEffect(() => {
    // Dynamically import the theme CSS
    switch (theme) {
      case 'bootstrap':
        import('@syncfusion/ej2-base/styles/bootstrap.css');
        break;
      case 'tailwind':
        import('@syncfusion/ej2-base/styles/tailwind.css');
        break;
      default:
        import('@syncfusion/ej2-base/styles/material.css');
    }
  }, [theme]);

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
          rowData={allData}
          columnDefs={columns}
          selectionModel={selectionModel}
          rowSelectionType={rowSelectionType}
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
