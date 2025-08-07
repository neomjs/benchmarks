import Model from '../../../node_modules/neo.mjs/src/data/Model.mjs';

/**
 * @class Benchmarks.model.Grid
 * @extends Neo.data.Model
 */
class GridModel extends Model {
    static config = {
        /**
         * @member {String} className='Benchmarks.model.Grid'
         * @protected
         */
        className: 'Benchmarks.model.Grid',
        /**
         * @member {Object[]} fields
         */
        fields: [{
            name: 'id',
            type: 'Int'
        }, {
            name: 'label',
            type: 'String'
        }]
    }
}

export default Neo.setupClass(GridModel);
