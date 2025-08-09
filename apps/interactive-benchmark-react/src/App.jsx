import React, { useState, useCallback, useRef } from 'react';
import Grid from './Grid';
import './App.css';

let idCounter = 1;

const buildData = (count) => {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            id: idCounter++,
            label: `row ${idCounter}`,
        });
    }
    return data;
};

function App() {
    const [data, setData] = useState([]);

    const create1k = () => setData(buildData(1000));
    const create10k = () => console.log('Create 10k rows');
    const update = () => console.log('Update every 10th row');
    const select = () => console.log('Select row');
    const swap = () => console.log('Swap rows');
    const remove = () => console.log('Remove row');
    const clear = () => console.log('Clear rows');
    const runHeavy = () => console.log('Run Heavy Calculation');
    const runHeavyTask = () => console.log('Run Heavy Calculation (Task Worker)');
    const toggleFeed = () => console.log('Start/Stop Real-time Feed');

    return (
        <div className="app-container">
            <div className="button-container">
                <button onClick={create1k}>Create 1k rows</button>
                <button onClick={create10k}>Create 10k rows</button>
                <button onClick={update}>Update every 10th row</button>
                <button onClick={select}>Select</button>
                <button onClick={swap}>Swap</button>
                <button onClick={remove}>Remove</button>
                <button onClick={clear}>Clear</button>
                <button onClick={runHeavy}>Run Heavy Calculation</button>
                <button onClick={runHeavyTask}>Run Heavy Calculation (Task Worker)</button>
                <button onClick={toggleFeed}>Start/Stop Real-time Feed</button>
            </div>
            <div className="right-pane">
                <div className="input-container">
                    <div className="spinner"></div>
                    <input type="text" placeholder="Typing test..." />
                </div>
                <div className="grid-container">
                    <Grid data={data} />
                </div>
            </div>
        </div>
    );
}

export default App;