const dataWorker = new Worker(new URL('./data.worker.js', import.meta.url));

export const generateDataAsync = (amountRows, amountColumns) => {
  return new Promise((resolve) => {
    dataWorker.postMessage({ amountRows, amountColumns });
    dataWorker.onmessage = (e) => {
      resolve(e.data);
    };
  });
};
