import React, { useState, useCallback, useRef, useEffect, useReducer } from 'react';
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
    /*
     * PERFORMANCE OPTIMIZATION:
     * To handle high-frequency updates on a massive dataset without performance degradation,
     * this component deviates from the standard React `useState` pattern for its main `data` array.
     *
     * THE STRATEGY:
     * 1. `useRef` holds the data array (`data`). This allows us to mutate the array directly
     *    without triggering a re-render.
     * 2. `useReducer` is used as a simple `forceUpdate` mechanism.
     * 3. In the high-frequency `toggleFeed` interval, we directly mutate the `data.current` array.
     *    This avoids creating a new, up to 1M items array every 5ms, which would otherwise
     *    cause immense memory pressure and garbage collector lag.
     * 4. After mutating the data, we call `forceUpdate()` once to trigger a single, efficient
     *    re-render of the component.
     *
     * This is a known optimization pattern for performance-critical scenarios in React. It ensures
     * the benchmark fairly measures rendering performance under load, not the overhead of React's
     * standard immutable state management at this extreme scale.
     */
    const data = useRef([]);
    const [dataVersion, setDataVersion] = useState(0);
    const [selected, setSelected] = useState(null);
    const feedInterval = useRef(null);
    const gridRef = useRef(null);

    const create10k = () => {
        idCounter = 1;
        data.current = buildData(10000);
        setDataVersion(v => v + 1);
    };
    const create100k = () => {
        idCounter = 1;
        data.current = buildData(100000);
        setDataVersion(v => v + 1);
    };
    const create1M = () => {
        idCounter = 1;
        data.current = buildData(1000000);
        setDataVersion(v => v + 1);
    };
    const update = () => {
        const newData = [...data.current];
        for (let i = 0; i < newData.length; i += 10) {
            newData[i] = { ...newData[i], label: newData[i].label + ' updated' };
        }
        data.current = newData;
        setDataVersion(v => v + 1);
    };
    const select = () => {
        if (gridRef.current) {
            const visibleRows = gridRef.current.getVisibleRows();
            if (visibleRows.length > 0) {
                const randomVisibleIndex = Math.floor(Math.random() * visibleRows.length);
                const randomRow = visibleRows[randomVisibleIndex];
                const originalRowIndex = randomRow.index;
                setSelected(data.current[originalRowIndex].id);
            }
        }
    };
    const swap = () => {
        if (gridRef.current) {
            const visibleRows = gridRef.current.getVisibleRows();
            if (visibleRows.length > 1) {
                const newData = [...data.current];

                const visibleIndex1 = Math.floor(Math.random() * visibleRows.length);
                let visibleIndex2 = Math.floor(Math.random() * visibleRows.length);
                while (visibleIndex1 === visibleIndex2) {
                    visibleIndex2 = Math.floor(Math.random() * visibleRows.length);
                }

                const originalIndex1 = visibleRows[visibleIndex1].index;
                const originalIndex2 = visibleRows[visibleIndex2].index;

                [newData[originalIndex1], newData[originalIndex2]] = [newData[originalIndex2], newData[originalIndex1]];
                data.current = newData;
                setDataVersion(v => v + 1);
            }
        }
    };
    const remove = () => {
        if (data.current.length > 0) {
            const newData = [...data.current];
            const index = Math.floor(Math.random() * data.current.length);
            newData.splice(index, 1);
            data.current = newData;
            setDataVersion(v => v + 1);
        }
    };
    const clear = () => {
        data.current = [];
        idCounter = 1;
        setDataVersion(v => v + 1);
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
        console.log('Heavy calculation started in Task Worker...');
        const totalIterations = 50000000;
        const numSteps = 100;
        const singleOpIterations = totalIterations / numSteps;

        const worker = new Worker(new URL('./heavy-task.js', import.meta.url));
        let overallResult = 0;

        const runStep = (step) => {
            return new Promise(resolve => {
                worker.onmessage = (e) => {
                    resolve(e.data);
                };
                worker.postMessage(singleOpIterations);
            });
        };

        const runAllSteps = async () => {
            for (let step = 0; step < numSteps; step++) {
                const stepResult = await runStep(step);
                overallResult += stepResult;
                if (heavyCalcOutputRef.current) {
                    heavyCalcOutputRef.current.textContent = `Progress: ${((step + 1) / numSteps * 100).toFixed(0)}%`;
                }
            }
            console.log('Heavy calculation finished in Task Worker. Result:', overallResult);
            if (heavyCalcOutputRef.current) {
                heavyCalcOutputRef.current.textContent = 'Finished!';
            }
            worker.terminate();
        };

        runAllSteps();
    };

    const toggleFeed = () => {
        if (feedInterval.current) {
            clearInterval(feedInterval.current);
            feedInterval.current = null;
            console.log('Real-time feed stopped.');
        } else {
            console.log('Real-time feed started.');
            feedInterval.current = setInterval(() => {
                const currentData = data.current;
                if (currentData.length === 0) {
                    console.log('No rows to update. Stopping real-time feed.');
                    clearInterval(feedInterval.current);
                    feedInterval.current = null;
                    return;
                }
                const updateCount = 100;
                for (let i = 0; i < updateCount; i++) {
                    const randomIndex = Math.floor(Math.random() * currentData.length);
                    if (currentData[randomIndex]) {
                        // Directly mutate the array element for performance.
                        // This is safe because the array is held in a useRef.
                        currentData[randomIndex] = { ...currentData[randomIndex], label: `updated ${currentData[randomIndex].id} at ${new Date().toLocaleTimeString()}` };
                    }
                }
                // Trigger a single re-render after all mutations are done.
                setDataVersion(v => v + 1);
            }, 5);
        }
    };

    useEffect(() => {
        return () => {
            if (feedInterval.current) {
                clearInterval(feedInterval.current);
            }
        };
    }, []);

    const [mainThreadCounter, setMainThreadCounter] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMainThreadCounter(prev => prev + 1);
        }, 100); // Update every 100ms

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="app-container">
            <div className="button-container">
                <button onClick={create10k}>Create 10k Rows</button>
                <button onClick={create100k}>Create 100k Rows</button>
                <button onClick={create1M}>Create 1M Rows</button>
                <button onClick={update}>Update Every 10th Row</button>
                <button onClick={select}>Select Row</button>
                <button onClick={swap}>Swap Rows</button>
                <button onClick={remove}>Remove Row</button>
                <button onClick={clear}>Clear Rows</button>
                <button onClick={runHeavy}>Run Heavy Calculation</button>
                <button onClick={runHeavyTask}>Run Heavy Calculation (Task Worker)</button>
                <button onClick={toggleFeed}>Start/Stop Real-time Feed</button>
            </div>
            <div className="right-pane">
                <div className="input-container">
                    <div className="spinner"></div>
                    <input type="text" placeholder="Type here to test UI responsiveness" />
                    <div ref={heavyCalcOutputRef} style={{ marginLeft: '10px' }}></div>
                    <div style={{ marginLeft: '10px', fontWeight: 'bold', minWidth: '8.2em' }}>Counter: {mainThreadCounter}</div>
                </div>
                <div className="grid-container">
                    <Grid ref={gridRef} key={dataVersion} data={data.current} selected={selected} />
                </div>
            </div>
        </div>
    );
}

export default App;
