import BaseViewport          from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';
import Button                from '../../../node_modules/neo.mjs/src/button/Base.mjs';
import Container             from '../../../node_modules/neo.mjs/src/container/Base.mjs';
import BenchmarkGrid         from './Grid.mjs';
import ViewportController    from './ViewportController.mjs';
import ViewportStateProvider from './ViewportStateProvider.mjs';

/**
 * @class Benchmarks.view.Viewport
 * @extends Neo.container.Viewport
 */
class Viewport extends BaseViewport {
    static config = {
        /**
         * @member {String} className='Benchmarks.view.Viewport'
         * @protected
         */
        className: 'Benchmarks.view.Viewport',
        /**
         * @member {Object} controller=ViewportController
         */
        controller: ViewportController,
        /**
         * @member {Object} stateProvider=ViewportStateProvider
         */
        stateProvider: ViewportStateProvider,
        /**
         * @member {Object} layout={ntype:'vbox',align:'stretch'}
         */
        layout: {ntype: 'vbox', align: 'stretch'},
        /**
         * @member {Object[]} items
         */
        items: [{
            module: Container,
            flex  : 'none',
            layout: {ntype: 'hbox', align: 'start', pack: 'start'},
            style : {padding: '1em'},
            items : [{
                module : Button,
                text   : 'Create 1k rows',
                handler: 'createRows',
                rows   : 1000
            }, {
                module : Button,
                text   : 'Create 10k rows',
                style  : {marginLeft: '10px'},
                handler: 'createRows',
                rows   : 10000
            }, {
                module : Button,
                text   : 'Update every 10th row',
                style  : {marginLeft: '10px'},
                handler: 'updateRows'
            }, {
                module : Button,
                text   : 'Select',
                style  : {marginLeft: '10px'},
                handler: 'selectRow'
            }, {
                module : Button,
                text   : 'Swap',
                style  : {marginLeft: '10px'},
                handler: 'swapRows'
            }, {
                module : Button,
                text   : 'Remove',
                style  : {marginLeft: '10px'},
                handler: 'removeRow'
            }, {
                module : Button,
                text   : 'Clear',
                style  : {marginLeft: '10px'},
                handler: 'clearRows'
            }]
        }, {
            module   : BenchmarkGrid,
            flex     : 1,
            reference: 'benchmark-grid'
        }]
    }
}

export default Neo.setupClass(Viewport);
