import Task from './worker/Task.mjs';

export const onStart = () => {
    // This is the entry point for the Task Worker.
    // Neo.mjs will automatically instantiate and manage the Task class
    // based on its configuration (e.g., singleton, remote methods).
    console.log('Task Worker entry point loaded.');
};