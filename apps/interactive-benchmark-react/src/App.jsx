import React, { useState, useCallback, useRef, useEffect } from 'react';
import Grid from './Grid';
import './App.css';

let idCounter = 1;

const buildData = (count) => {
    const data = [];
    for (let i = 0; i < count; i++) {
        const newId = idCounter++;
        data.push({
            id: newId,
            label: `row ${newId}`,
        });
    }
    return data;
};

function App() {
    const [data, setData] = useState([]);
    const [selected, setSelected] = useState(null);
    const feedInterval = useRef(null);
    const gridRef = useRef(null);

    const create1k = () => {
        idCounter = 1;
        setData(buildData(1000));
    };
    const create10k = () => {
        idCounter = 1;
        setData(buildData(10000));
    };
    const update = () => {
        const newData = [...data];
        for (let i = 0; i < newData.length; i += 10) {
            newData[i] = { ...newData[i], label: newData[i].label + ' updated' };
        }
        setData(newData);
    };
    const select = () => {
        if (gridRef.current) {
            const visibleRows = gridRef.current.getVisibleRows();
            if (visibleRows.length > 0) {
                const randomVisibleIndex = Math.floor(Math.random() * visibleRows.length);
                const randomRow = visibleRows[randomVisibleIndex];
                const originalRowIndex = randomRow.index;
                setSelected(data[originalRowIndex].id);
            }
        }
    };
    const swap = () => {
        if (gridRef.current) {
            const visibleRows = gridRef.current.getVisibleRows();
            if (visibleRows.length > 1) {
                const newData = [...data];

                const visibleIndex1 = Math.floor(Math.random() * visibleRows.length);
                let visibleIndex2 = Math.floor(Math.random() * visibleRows.length);
                while (visibleIndex1 === visibleIndex2) {
                    visibleIndex2 = Math.floor(Math.random() * visibleRows.length);
                }

                const originalIndex1 = visibleRows[visibleIndex1].index;
                const originalIndex2 = visibleRows[visibleIndex2].index;

                [newData[originalIndex1], newData[originalIndex2]] = [newData[originalIndex2], newData[originalIndex1]];
                setData(newData);
            }
        }
    };
    const remove = () => {
        if (data.length > 0) {
            const newData = [...data];
            const index = Math.floor(Math.random() * data.length);
            newData.splice(index, 1);
            setData(newData);
        }
    };
    const clear = () => {
        setData([]);
        idCounter = 1;
    };

    const heavyCalcOutputRef = useRef(null);

    const runHeavy = () => {
        console.log('Heavy calculation started in Main Thread...');
        let result = 0;
        const iterations = 50000000;
        const updateInterval = iterations / 100; // Update 100 times during the loop

        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
            if (i % updateInterval === 0 && heavyCalcOutputRef.current) {
                heavyCalcOutputRef.current.textContent = `Progress: ${((i / iterations) * 100).toFixed(0)}%`;
            }
        }
        console.log('Heavy calculation finished in Main Thread. Result:', result);
        if (heavyCalcOutputRef.current) {
            heavyCalcOutputRef.current.textContent = 'Finished!';
        }
    };

    const runHeavyTask = () => {
        const worker = new Worker(new URL('./heavy-task.js', import.meta.url));
        console.log('Heavy calculation started in Task Worker...');
        worker.onmessage = (e) => {
            console.log('Heavy calculation finished in Task Worker. Result:', e.data);
            worker.terminate();
        };
        worker.postMessage(50000000);
    };

    const toggleFeed = () => {
        if (feedInterval.current) {
            clearInterval(feedInterval.current);
            feedInterval.current = null;
            console.log('Real-time feed stopped.');
        } else {
            console.log('Real-time feed started.');
            feedInterval.current = setInterval(() => {
                setData(currentData => {
                    const newData = [...currentData];
                    const updateCount = 100;
                    for (let i = 0; i < updateCount; i++) {
                        const randomIndex = Math.floor(Math.random() * newData.length);
                        if (newData[randomIndex]) {
                            newData[randomIndex] = { ...newData[randomIndex], label: `updated ${newData[randomIndex].id} at ${new Date().toLocaleTimeString()}` };
                        }
                    }
                    return newData;
                });
            }, 16);
        }
    };

    useEffect(() => {
        return () => {
            if (feedInterval.current) {
                clearInterval(feedInterval.current);
            }
        };
    }, []);

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
                    <div ref={heavyCalcOutputRef} style={{ marginLeft: '10px' }}></div>
                </div>
                <div className="grid-container">
                    <Grid ref={gridRef} data={data} selected={selected} />
                </div>
            </div>
        </div>
    );
}

export default App;