import BaseGridContainer from '../../../node_modules/neo.mjs/src/grid/Container.mjs';
import Button            from '../../../node_modules/neo.mjs/src/button/Base.mjs';
import MainStore         from '../MainStore.mjs';

/**
 * @class BigData.view.GridContainer
 * @extends Neo.grid.Container
 */
class GridContainer extends BaseGridContainer {
    static config = {
        /**
         * @member {String} className='BigData.view.GridContainer'
         * @protected
         */
        className: 'BigData.view.GridContainer',
        /**
         * @member {Number} amountColumns_=50
         * @reactive
         */
        amountColumns_: 50,
        /**
         * @member {Object} body
         */
        body: {
            bufferColumnRange: 3,
            bufferRowRange   : 5
        },
        /**
         * Default configs for each column
         * @member {Object} columnDefaults
         */
        columnDefaults: {
            cellAlign           : 'right',
            defaultSortDirection: 'DESC',
            width               : 100
        },
        /**
         * @member {Object[]} store=MainStore
         * @reactive
         */
        store: MainStore
    }

    /**
     * Triggered after the amountColumns config got changed
     * @param {Number} value
     * @param {Number} oldValue
     * @returns {Promise<void>}
     * @protected
     */
    async afterSetAmountColumns(value, oldValue) {
        let me = this;

        // Silent update
        me.store._amountColumns = value;
        // Wait until the remote data generation is done
        await me.store.afterSetAmountColumns(value, oldValue);

        let i       = 7,
            columns = [
                {type: 'index', dataField: 'id', text: '#', width: 60},
                {cellAlign: 'left', dataField: 'firstname', defaultSortDirection: 'ASC', text: 'Firstname', width: 150},
                {cellAlign: 'left', dataField: 'lastname',  defaultSortDirection: 'ASC', text: 'Lastname',  width: 150},
                {cellAlign: 'left', dataField: 'countAction', text: 'Increase Counter', width: 150,  component: ({record}) => ({
                    module: Button,
                    handler() {record.counter++},
                    text  : record.firstname + ' ++',
                    width : 130
                })},
                {type: 'animatedChange', dataField: 'counter', text: 'Counter'},
                {type: 'progress',       dataField: 'progress', text: 'Progress', width: 150}
            ];

        for (; i <= value; i++) {
            columns.push({dataField: 'number' + i, text: 'Number ' + i})
        }

        me.columns = columns
    }
}

export default Neo.setupClass(GridContainer);
