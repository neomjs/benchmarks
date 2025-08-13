import { useState, useEffect, useRef } from 'react';

function Controls({ onDataConfigChange, onFilterChange, filteredRowCount }) {
  const [amountRows, setAmountRows] = useState(1000);
  const [amountColumns, setAmountColumns] = useState(50);
  const [theme, setTheme] = useState('alpine-dark');
  const [firstnameFilter, setFirstnameFilter] = useState('');
  const [lastnameFilter, setLastnameFilter] = useState('');
  const [selectionModel, setSelectionModel] = useState('row'); // 'row' or 'cell'
  const [rowSelectionType, setRowSelectionType] = useState('single'); // 'single' or 'multiple'
  const [bufferRowRange, setBufferRowRange] = useState(5);
  const [bufferColumnRange, setBufferColumnRange] = useState(3);

  const [activeTab, setActiveTab] = useState('settings'); // New state for active tab

  const isInitialMount = useRef(true); // Create a ref

  // Helper to get the current data config state
  const getCurrentDataConfig = () => ({
    amountRows,
    amountColumns,
    theme,
    selectionModel,
    rowSelectionType,
    bufferRowRange,
    bufferColumnRange,
  });

  // Helper to get the current filter state
  const getCurrentFilterConfig = () => ({
    firstnameFilter,
    lastnameFilter,
  });

  // Use useEffect to trigger onDataConfigChange whenever relevant data config state changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false; // Set to false after first run
    } else {
      onDataConfigChange(getCurrentDataConfig());
    }
  }, [amountRows, amountColumns, theme, selectionModel, rowSelectionType, bufferRowRange, bufferColumnRange]);

  // Use useEffect to trigger onFilterChange whenever relevant filter state changes
  useEffect(() => {
    onFilterChange(getCurrentFilterConfig());
  }, [firstnameFilter, lastnameFilter]);

  return (
    <div className="controls">
      {/* Tab Headers */}
      <div className="tab-headers">
        <button
          className={activeTab === 'settings' ? 'active' : ''}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={activeTab === 'selection' ? 'active' : ''}
          onClick={() => setActiveTab('selection')}
        >
          Selection
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'settings' && (
          <div className="settings-tab-content">
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
              <label>Buffer Rows</label>
              <select value={bufferRowRange} onChange={(e) => setBufferRowRange(parseInt(e.target.value))}>
                <option value="0">0</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
            <div className="control-group">
              <label>Buffer Columns</label>
              <select value={bufferColumnRange} onChange={(e) => setBufferColumnRange(parseInt(e.target.value))}>
                <option value="0">0</option>
                <option value="3">3</option>
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="20">20</option>
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
              <label>Firstname</label>
              <input
                type="text"
                value={firstnameFilter}
                onChange={(e) => setFirstnameFilter(e.target.value)}
                placeholder="Filter by firstname"
              />
            </div>
            <div className="control-group">
              <label>Lastname</label>
              <input
                type="text"
                value={lastnameFilter}
                onChange={(e) => setLastnameFilter(e.target.value)}
                placeholder="Filter by lastname"
              />
            </div>
            <div className="control-group">
              <label>Filtered rows: {filteredRowCount}</label>
            </div>
          </div>
        )}

        {activeTab === 'selection' && (
          <div className="selection-tab-content">
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
          </div>
        )}
      </div>
    </div>
  );
}

export default Controls;
