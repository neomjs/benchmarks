import { useState } from 'react';

function Controls({ onConfigChange }) {
  const [amountRows, setAmountRows] = useState(1000);
  const [amountColumns, setAmountColumns] = useState(50);
  const [theme, setTheme] = useState('alpine');
  const [firstnameFilter, setFirstnameFilter] = useState('');
  const [lastnameFilter, setLastnameFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState('row'); // 'row' or 'cell'
  const [rowSelectionType, setRowSelectionType] = useState('single'); // 'single' or 'multiple'

  const handleApply = () => {
    onConfigChange({ amountRows, amountColumns, theme, firstnameFilter, lastnameFilter, selectionModel, rowSelectionType });
  };

  return (
    <div className="controls">
      <div className="control-group">
        <label>Amount Rows</label>
        <select value={amountRows} onChange={(e) => setAmountRows(parseInt(e.target.value))}>
          <option value="1000">1000</option>
          <option value="5000">5000</option>
          <option value="10000">10000</option>
          <option value="20000">20000</option>
          <option value="50000">50000</option>
          <option value="100000">100000</option>
        </select>
      </div>
      <div className="control-group">
        <label>Amount Columns</label>
        <select value={amountColumns} onChange={(e) => setAmountColumns(parseInt(e.target.value))}>
          <option value="10">10</option>
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="75">75</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
      </div>

      <div className="control-group">
        <label>Theme</label>
        <div>
          <input
            type="radio"
            id="theme-alpine"
            name="theme"
            value="alpine"
            checked={theme === 'alpine'}
            onChange={(e) => setTheme(e.target.value)}
          />
          <label htmlFor="theme-alpine">Light</label>
        </div>
        <div>
          <input
            type="radio"
            id="theme-alpine-dark"
            name="theme"
            value="alpine-dark"
            checked={theme === 'alpine-dark'}
            onChange={(e) => setTheme(e.target.value)}
          />
          <label htmlFor="theme-alpine-dark">Dark</label>
        </div>
      </div>

      <div className="control-group">
        <label>Firstname Filter</label>
        <input
          type="text"
          value={firstnameFilter}
          onChange={(e) => setFirstnameFilter(e.target.value)}
          placeholder="Filter by firstname"
        />
      </div>
      <div className="control-group">
        <label>Lastname Filter</label>
        <input
          type="text"
          value={lastnameFilter}
          onChange={(e) => setLastnameFilter(e.target.value)}
          placeholder="Filter by lastname"
        />
      </div>

      <div className="control-group">
        <label>Selection Model</label>
        <div>
          <input
            type="radio"
            id="selection-row"
            name="selectionModel"
            value="row"
            checked={selectionModel === 'row'}
            onChange={(e) => setSelectionModel(e.target.value)}
          />
          <label htmlFor="selection-row">Row Selection</label>
        </div>
        <div>
          <input
            type="radio"
            id="selection-cell"
            name="selectionModel"
            value="cell"
            checked={selectionModel === 'cell'}
            onChange={(e) => setSelectionModel(e.target.value)}
          />
          <label htmlFor="selection-cell">Cell Selection</label>
        </div>
      </div>

      {selectionModel === 'row' && (
        <div className="control-group">
          <label>Row Selection Type</label>
          <div>
            <input
              type="radio"
              id="row-selection-single"
              name="rowSelectionType"
              value="single"
              checked={rowSelectionType === 'single'}
              onChange={(e) => setRowSelectionType(e.target.value)}
            />
            <label htmlFor="row-selection-single">Single</label>
          </div>
          <div>
            <input
              type="radio"
              id="row-selection-multiple"
              name="rowSelectionType"
              value="multiple"
              checked={rowSelectionType === 'multiple'}
              onChange={(e) => setRowSelectionType(e.target.value)}
            />
            <label htmlFor="row-selection-multiple">Multiple</label>
          </div>
        </div>
      )}

      <button onClick={handleApply}>Apply</button>
    </div>
  );
}

export default Controls;
