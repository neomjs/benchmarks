import React, { useState, useEffect } from 'react';

const Counter = () => {
    const [mainThreadCounter, setMainThreadCounter] = useState(0);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setMainThreadCounter(prev => prev + 1);
        }, 100); // Update every 100ms

        return () => clearInterval(intervalId);
    }, []);

    return (
        <div style={{ marginLeft: '10px', fontWeight: 'bold', minWidth: '8.2em' }}>
            Counter: {mainThreadCounter}
        </div>
    );
};

export default Counter;
