self.onmessage = (e) => {
    const iterations = e.data;
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
    }
    self.postMessage(result);
};