import GridContainer from '../../../node_modules/neo.mjs/src/grid/Container.mjs';

/**
 * @class Benchmarks.view.Grid
 * @extends Neo.grid.Container
 */
class BenchmarkGrid extends GridContainer {
    static config = {
        /**
         * @member {String} className='Benchmarks.view.Grid'
         * @protected
         */
        className: 'Benchmarks.view.Grid',
        /**
         * @member {Object} bind
         */
        bind: {
            store: 'stores.benchmarkGridStore'
        },
        /**
         * @member {Object[]} columns
         */
        columns: [{
            dataField: 'id',
            text     : 'Id'
        }, {
            dataField: 'label',
            text     : 'Label',
        }]
    }
}

export default Neo.setupClass(BenchmarkGrid);
