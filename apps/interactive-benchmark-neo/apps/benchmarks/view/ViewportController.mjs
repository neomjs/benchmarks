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

    selectRow() {
        let store   = this.getStore('benchmarkGridStore'),
            records = store.items,
            len     = records.length,
            grid    = this.getReference('benchmark-grid');

        if (len > 0) {
            let randomIndex = Math.floor(Math.random() * len);
            grid.selectionModel.selectRow(records[randomIndex].id);
        }
    }

    swapRows() {
        let store   = this.getStore('benchmarkGridStore'),
            records = store.items,
            len     = records.length;

        if (len >= 2) {
            let idx1 = Math.floor(Math.random() * len);
            let idx2 = Math.floor(Math.random() * len);

            while (idx1 === idx2) {
                idx2 = Math.floor(Math.random() * len);
            }

            // Swap the content (labels) of the two records
            let tempLabel       = records[idx1].label;
            records[idx1].label = records[idx2].label;
            records[idx2].label = tempLabel;
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
