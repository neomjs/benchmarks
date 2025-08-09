import Base from '../../../node_modules/neo.mjs/src/controller/Component.mjs';

/**
 * @class Benchmarks.view.ViewportController
 * @extends Neo.controller.Component
 */
class ViewportController extends Base {
    static config = {
        /**
         * @member {String} className='Benchmarks.view.ViewportController'
         * @protected
         */
        className: 'Benchmarks.view.ViewportController'
    }

    /**
     * @member {Number} #counter=0
     * @private
     */
    #counter = 0

    /**
     * @member {Number|null} realtimeFeedInterval=null
     * @private
     */
    realtimeFeedInterval = null

    onConstructed() {
        super.onConstructed();

        this.mainThreadCounterInterval = setInterval(() => {
            this.getStateProvider().data.mainThreadCounter++;
        }, 100);
    }

    destroy(...args) {
        clearInterval(this.mainThreadCounterInterval);
        super.destroy(...args);
    }

    clearRows() {
        let store = this.getStore('benchmarkGridStore');
        store.clear();
        this.#counter = 0;
    }

    /**
     * @param {Object} data
     * @param {Neo.button.Base} data.component
     * @param {Number} data.component.rows
     */
    createRows(data) {
        let amount = data.component.rows,
            rows   = [],
            i      = 0,
            store  = this.getStore('benchmarkGridStore');

        for (; i < amount; i++) {
            this.#counter++;
            rows.push({id: this.#counter, label: 'row ' + this.#counter});
        }
        store.add(rows);
    }

    removeRow() {
        let store   = this.getStore('benchmarkGridStore'),
            records = store.items,
            len     = records.length;

        if (len > 0) {
            let randomIndex = Math.floor(Math.random() * len);
            store.remove(records[randomIndex]);
        }
    }

    runHeavyCalculation() {
        console.log('Heavy calculation started in App Worker...');
        let result = 0;
        const iterations = 50000000;
        const updateInterval = iterations / 100; // Update 100 times during the loop

        for (let i = 0; i < iterations; i++) {
            result += Math.sqrt(i) * Math.sin(i) / Math.cos(i) + Math.log(i + 1);
            if (i % updateInterval === 0) {
                this.getStateProvider().data.heavyCalcProgress = `Progress: ${((i / iterations) * 100).toFixed(0)}%`;
            }
        }
        console.log('Heavy calculation finished in App Worker. Result:', result);
        this.getStateProvider().data.heavyCalcProgress = 'Finished!';
    }

    async runHeavyCalculationInTaskWorker() {
        console.log('Heavy calculation started in Task Worker...');
        const totalIterations = 50000000;
        const numSteps = 100;
        const singleOpIterations = totalIterations / numSteps;

        let overallResult = 0;
        for (let step = 0; step < numSteps; step++) {
            const stepResult = await Benchmarks.worker.Task.performHeavyCalculation({iterations: singleOpIterations});
            overallResult += stepResult; // Accumulate result if needed
            this.getStateProvider().data.heavyCalcProgress = `Progress: ${((step + 1) / numSteps * 100).toFixed(0)}%`;
        }
        console.log('Heavy calculation finished in Task Worker. Result:', overallResult);
        this.getStateProvider().data.heavyCalcProgress = 'Finished!';
    }

    selectRow() {
        let store         = this.getStore('benchmarkGridStore'),
            {count}       = store,
            grid          = this.getReference('benchmark-grid'),
            {mountedRows} = grid.body;

        if (count > 0) {
            if (mountedRows[1] > mountedRows[0]) {
                // Default case: select a random row from the visible (mounted) ones
                let randomIndex = Math.floor(Math.random() * (mountedRows[1] - mountedRows[0] + 1)) + mountedRows[0];

                // Ensure the index is within the bounds of the actual store items
                if (randomIndex < count) {
                    grid.body.selectionModel.selectRow(store.getAt(randomIndex).id);
                }
            } else {
                // Fallback for when mountedRows is not ready: select the first row
                grid.body.selectionModel.selectRow(store.getAt(0).id);
            }
        }
    }

    swapRows() {
        let store         = this.getStore('benchmarkGridStore'),
            {count}       = store,
            grid          = this.getReference('benchmark-grid'),
            {mountedRows} = grid.body,
            range         = mountedRows[1] - mountedRows[0];

        if (count >= 2 && range >= 2) {
            let baseIndex = mountedRows[0];

            let idx1 = Math.floor(Math.random() * range) + baseIndex;
            let idx2 = Math.floor(Math.random() * range) + baseIndex;

            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * range) + baseIndex;
            }

            let record1 = store.getAt(idx1);
            let record2 = store.getAt(idx2);

            const updatedRecords = [
                {id: record1.id, label: record2.label},
                {id: record2.id, label: record1.label}
            ];

            grid.bulkUpdateRecords(updatedRecords);
        }
    }

    toggleRealtimeFeed() {
        if (this.realtimeFeedInterval) {
            clearInterval(this.realtimeFeedInterval);
            this.realtimeFeedInterval = null;
            console.log('Real-time feed stopped.');
        } else {
            const store = this.getStore('benchmarkGridStore');
            const grid = this.getReference('benchmark-grid');
            const updateCount = 100; // Number of rows to update per interval

            this.realtimeFeedInterval = setInterval(() => {
                const updatedRecords = [];
                const records = store.items;
                const len = records.length;

                if (len === 0) {
                    console.log('No rows to update. Stopping real-time feed.');
                    clearInterval(this.realtimeFeedInterval);
                    this.realtimeFeedInterval = null;
                    return;
                }

                for (let i = 0; i < updateCount; i++) {
                    const randomIndex = Math.floor(Math.random() * len);
                    const record = records[randomIndex];
                    updatedRecords.push({id: record.id, label: `updated ${record.id} at ${new Date().toLocaleTimeString()}`});
                }
                grid.bulkUpdateRecords(updatedRecords);
            }, 5); // Update every 5ms
            console.log('Real-time feed started.');
        }
    }

    updateRows() {
        let store          = this.getStore('benchmarkGridStore'),
            records        = store.items,
            updatedRecords = [],
            i              = 0,
            len            = records.length,
            grid           = this.getReference('benchmark-grid');

        for (; i < len; i += 10) {
            updatedRecords.push({id: records[i].id, label: 'updated row ' + records[i].id});
        }
        grid.bulkUpdateRecords(updatedRecords);
    }
}

export default Neo.setupClass(ViewportController);
