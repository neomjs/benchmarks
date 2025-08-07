import Store     from '../../../node_modules/neo.mjs/src/data/Store.mjs';
import GridModel from '../model/Grid.mjs';

/**
 * @class Benchmarks.store.Grid
 * @extends Neo.data.Store
 */
class GridStore extends Store {
    static config = {
        /**
         * @member {String} className='Benchmarks.store.Grid'
         * @protected
         */
        className: 'Benchmarks.store.Grid',
        /**
         * @member {Neo.data.Model} model=GridModel
         */
        model: GridModel,
        /**
         * @member {String} keyProperty='id'
         */
        keyProperty: 'id'
    }
}

export default Neo.setupClass(GridStore);
