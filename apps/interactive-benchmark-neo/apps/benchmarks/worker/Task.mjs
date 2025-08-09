import Base from '../../../node_modules/neo.mjs/src/core/Base.mjs';

/**
 This class contains a CPU-intensive task to be run in a dedicated Task Worker.
 * @class Benchmarks.worker.Task
 * @extends Neo.core.Base
 * @singleton
 */
class Task extends Base {
    static config = {
        className: 'Benchmarks.worker.Task',
        singleton: true,
        remote: {
            app: [
                'performHeavyCalculation'
            ]
        }
    }

    /**
     * Performs a CPU-intensive calculation.
     * @param {Object} data
     * @param {Number} data.iterations The number of iterations for the calculation.
     * @returns {Number} The result of the calculation.
     */
    performHeavyCalculation(data) {
        let result = 0;
        for (let i = 0; i < data.iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
        }
        return result;
    }
}

export default Neo.setupClass(Task);
