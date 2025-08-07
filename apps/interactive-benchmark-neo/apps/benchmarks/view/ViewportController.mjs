import Base from '../../../node_modules/neo.mjs/src/controller/Base.mjs';

/**
 * @class Benchmarks.view.ViewportController
 * @extends Neo.controller.Base
 */
class ViewportController extends Base {
    static config = {
        /**
         * @member {String} className='Benchmarks.view.ViewportController'
         * @protected
         */
        className: 'Benchmarks.view.ViewportController',
        /**
         * @member {Number} _counter=0
         * @private
         */
        _counter: 0
    }

    /**
     * @param {Number} amount
     */
    createRows(amount) {
        let data = [],
            i    = 0,
            store = this.getStore('benchmarkGridStore');

        for (; i < amount; i++) {
            this._counter++;
            data.push({id: this._counter, label: 'row ' + this._counter});
        }
        store.add(data);
    }

    updateRows() {
        let store = this.getStore('benchmarkGridStore'),
            records = store.items,
            i = 0,
            len = records.length;

        for (; i < len; i += 10) {
            records[i].label = 'updated row ' + records[i].id;
        }
    }

    selectRow() {
        let store = this.getStore('benchmarkGridStore'),
            records = store.items,
            len = records.length,
            grid = this.getView().down('benchmark-grid');

        if (len > 0) {
            let randomIndex = Math.floor(Math.random() * len);
            grid.selection = [records[randomIndex]];
        }
    }

    swapRows() {
        let store = this.getStore('benchmarkGridStore'),
            records = store.items,
            len = records.length;

        if (len >= 2) {
            let idx1 = Math.floor(Math.random() * len);
            let idx2 = Math.floor(Math.random() * len);

            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * len);
            }

            // Swap the content (labels) of the two records
            let tempLabel = records[idx1].label;
            records[idx1].label = records[idx2].label;
            records[idx2].label = tempLabel;
        }
    }

    removeRow() {
        let store = this.getStore('benchmarkGridStore'),
            records = store.items,
            len = records.length;

        if (len > 0) {
            let randomIndex = Math.floor(Math.random() * len);
            store.remove(records[randomIndex]);
        }
    }

    clearRows() {
        let store = this.getStore('benchmarkGridStore');
        store.clear();
        this._counter = 0;
    }
}

export default Neo.setupClass(ViewportController);
