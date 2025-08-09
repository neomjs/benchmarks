import StateProvider from '../../../node_modules/neo.mjs/src/state/Provider.mjs';
import GridStore     from '../store/Grid.mjs';

/**
 * @class Benchmarks.view.ViewportStateProvider
 * @extends Neo.state.Provider
 */
class ViewportStateProvider extends StateProvider {
    static config = {
        /**
         * @member {String} className='Benchmarks.view.ViewportStateProvider'
         * @protected
         */
        className: 'Benchmarks.view.ViewportStateProvider',
        /**
         * @member {Object} data
         */
        data: {
            /**
             * @member {String} data.heavyCalcProgress='Progress: 0%'
             */
            heavyCalcProgress: 'Progress: 0%'
        },
        /**
         * @member {Object} stores
         */
        stores: {
            benchmarkGridStore: {
                module: GridStore
            }
        }
    }
}

export default Neo.setupClass(ViewportStateProvider);
