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
        let store         = this.getStore('benchmarkGridStore'),
            {count}       = store,
            grid          = this.getReference('benchmark-grid'),
            {mountedRows} = grid.body;

        if (count > 0 && mountedRows[1] > mountedRows[0]) {
            // Correctly calculate a random index within the mounted range (inclusive)
            let randomIndex = Math.floor(Math.random() * (mountedRows[1] - mountedRows[0] + 1)) + mountedRows[0];

            // Ensure the index is within the bounds of the actual store items
            if (randomIndex < count) {
                grid.body.selectionModel.selectRow(store.getAt(randomIndex).id);
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
