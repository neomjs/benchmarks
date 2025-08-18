import React, { useState, useCallback, useRef, useEffect } from 'react';
import Grid from './Grid';
import Counter from './Counter';
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
    const heavyCalcOutputRef = useRef(null);

    const create10k = useCallback(() => {
        idCounter = 1;
        setData(buildData(10000));
    }, []);

    const create100k = useCallback(() => {
        idCounter = 1;
        setData(buildData(100000));
    }, []);

    const create1M = useCallback(() => {
        idCounter = 1;
        setData(buildData(1000000));
    }, []);

    const update = useCallback(() => {
        setData(data => {
            const newData = [...data];
            for (let i = 0; i < newData.length; i += 10) {
                newData[i] = { ...newData[i], label: newData[i].label + ' updated' };
            }
            return newData;
        });
    }, []);

    const select = useCallback(() => {
        if (gridRef.current) {
            const visibleRows = gridRef.current.getVisibleRows();
            if (visibleRows.length > 0) {
                const randomVisibleIndex = Math.floor(Math.random() * visibleRows.length);
                const randomRow = visibleRows[randomVisibleIndex];
                const originalRowIndex = randomRow.index;
                setSelected(data[originalRowIndex].id);
            }
        }
    }, [data]);

    const swap = useCallback(() => {
        if (gridRef.current) {
            setData(data => {
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
                    return newData;
                }
                return data;
            });
        }
    }, []);

    const remove = useCallback(() => {
        setData(data => {
            if (data.length > 0) {
                const newData = [...data];
                const index = Math.floor(Math.random() * data.length);
                newData.splice(index, 1);
                return newData;
            }
            return data;
        });
    }, []);

    const clear = useCallback(() => {
        setData([]);
        idCounter = 1;
    }, []);

    const runHeavy = useCallback(() => {
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
    }, []);

    const runHeavyTask = useCallback(() => {
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
    }, []);

    const toggleFeed = useCallback(() => {
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
            }, 5);
        }
    }, []);

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
                    <Counter />
                </div>
                <div className="grid-container">
                    <Grid ref={gridRef} data={data} selected={selected} />
                </div>
            </div>
        </div>
    );
}

export default App;
