import Model from '../../node_modules/neo.mjs/src/data/Model.mjs';

/**
 * @class BigData.MainModel
 * @extends Neo.data.Model
 */
class MainModel extends Model {
    static config = {
        /**
         * @member {String} className='BigData.MainModel'
         * @protected
         */
        className: 'BigData.MainModel',
        /**
         * @member {Number} amountColumns_=50
         * @reactive
         */
        amountColumns_: 50
    }

    /**
     * Triggered after the amountColumns config got changed
     * @param {Number} value
     * @param {Number} oldValue
     * @protected
     */
    afterSetAmountColumns(value, oldValue) {
        let i      = 7,
            fields = [
                {name: 'id',        type: 'Int'},
                {name: 'countAction'},
                {name: 'counter',   type: 'Int'},
                {name: 'firstname', type: 'String'},
                {name: 'lastname',  type: 'String'},
                {name: 'progress',  type: 'Int'}
            ];

        for (; i <= value; i++) {
            fields.push({name: 'number' + i, type: 'Int'})
        }

        this.fields = fields
    }
}

export default Neo.setupClass(MainModel);
