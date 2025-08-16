import Model from './MainModel.mjs';
import Store from '../../node_modules/neo.mjs/src/data/Store.mjs';

/**
 * @class BigData.MainStore
 * @extends Neo.data.Store
 */
class MainStore extends Store {
    static config = {
        /**
         * @member {String} className='BigData.MainStore'
         * @protected
         */
        className: 'BigData.MainStore',
        /**
         * @member {Number} amountColumns_=50
         * @reactive
         */
        amountColumns_: 50,
        /**
         * @member {Number} amountRows_=1000
         * @reactive
         */
        amountRows_: 1000,
        /**
         * @member {Object[]} filters
         * @reactive
         */
        filters: [{
            property: 'firstname',
            operator: 'like',
            value   : null
        }, {
            property: 'lastname',
            operator: 'like',
            value   : null
        }],
        /**
         * @member {Neo.data.Model} model=Model
         * @reactive
         */
        model: Model
    }

    /**
     * Triggered after the amountColumns config got changed
     * @param {Number} value
     * @param {Number} oldValue
     * @returns {Promise<void>}
     * @protected
     */
    async afterSetAmountColumns(value, oldValue) {
        if (oldValue !== undefined) {
            let me    = this,
                data  = await me.generateData(me.amountRows, value),
                start = performance.now();

            me.model.amountColumns = value;

            console.log('Start generating data and adding to collection');

            if (me.items?.length > 0) {
                me.clear()
            }

            me.add(data);

            console.log(`Data generation and collection add total time: ${Math.round(performance.now() - start)}ms`)
        }
    }

    /**
     * Triggered after the amountRows config got changed
     * @param {Number} value
     * @param {Number} oldValue
     * @returns {Promise<void>}
     * @protected
     */
    async afterSetAmountRows(value, oldValue) {
        let me    = this,
            data  = await me.generateData(value, me.amountColumns),
            start = performance.now();

        console.log('Start generating data and adding to collection');

        if (me.items?.length > 0) {
            me.clear()
        }

        me.add(data);

        console.log(`Data generation and collection add total time: ${Math.round(performance.now() - start)}ms`)
    }

    /**
     * @param {Number} amountRows
     * @param {Number} amountColumns
     * @returns {Promise<Object[]>}
     */
    async generateData(amountRows, amountColumns) {
        console.log('Start creating data', {amountRows, amountColumns});

        let start   = performance.now(),
            records = await BigData.task.Helper.generateGridData({amountRows, amountColumns}); // async remote method access

        console.log(`Data creation total time: ${Math.round(performance.now() - start)}ms`);

        return records
    }
}

export default Neo.setupClass(MainStore);
