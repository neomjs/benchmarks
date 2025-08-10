/// <reference lib="webworker" />

addEventListener('message', ({ data }) => {
  console.log('Heavy calculation started in Task Worker...');
  let result = 0;
  const iterations = 50000000;
  for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
  }
  console.log('Heavy calculation finished in Task Worker. Result:', result);
  postMessage(result);
});