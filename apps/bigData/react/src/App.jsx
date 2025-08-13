import { useState, useCallback, useMemo } from 'react';
import './App.css';
import Controls from './Controls';
import Grid from './Grid';
import { generateData } from './data.jsx';

function App() {
  const [allData, setAllData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [theme, setTheme] = useState('alpine');
  const [firstnameFilter, setFirstnameFilter] = useState('');
  const [lastnameFilter, setLastnameFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState('row');
  const [rowSelectionType, setRowSelectionType] = useState('single');

  const handleConfigChange = useCallback((config) => {
    const { amountRows, amountColumns, theme, firstnameFilter, lastnameFilter, selectionModel, rowSelectionType } = config;
    const { data, columns } = generateData(amountRows, amountColumns);
    setAllData(data);
    setColumns(columns);
    setTheme(theme);
    setFirstnameFilter(firstnameFilter);
    setLastnameFilter(lastnameFilter);
    setSelectionModel(selectionModel);
    setRowSelectionType(rowSelectionType);
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
      <Controls onConfigChange={handleConfigChange} />
      <Grid
        rowData={filteredData}
        columnDefs={columns}
        theme={theme}
        selectionModel={selectionModel}
        rowSelectionType={rowSelectionType}
      />
    </div>
  );
}

export default App;