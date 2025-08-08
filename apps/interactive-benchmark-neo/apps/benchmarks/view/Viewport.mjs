import BaseViewport          from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';
import Button                from '../../../node_modules/neo.mjs/src/button/Base.mjs';
import Container             from '../../../node_modules/neo.mjs/src/container/Base.mjs';
import TextField             from '../../../node_modules/neo.mjs/src/form/field/Text.mjs';
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
         * @member {String[]} cls=['benchmarks-viewport']
         */
        cls: ['benchmarks-viewport'],
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
            cls   : 'benchmark-toolbar',
            flex  : 'none',
            layout: {ntype: 'hbox', align: 'start', pack: 'start', wrap: 'wrap'},
            items : [{
                module : Button,
                handler: 'createRows',
                rows   : 1000,
                text   : 'Create 1k rows'
            }, {
                module : Button,
                handler: 'createRows',
                rows   : 10000,
                text   : 'Create 10k rows'
            }, {
                module : Button,
                handler: 'updateRows',
                text   : 'Update every 10th row'
            }, {
                module : Button,
                handler: 'selectRow',
                text   : 'Select'
            }, {
                module : Button,
                handler: 'swapRows',
                text   : 'Swap'
            }, {
                module : Button,
                handler: 'removeRow',
                text   : 'Remove'
            }, {
                module : Button,
                handler: 'clearRows',
                text   : 'Clear'
            }, {
                module : Button,
                handler: 'toggleRealtimeFeed',
                text   : 'Start/Stop Real-time Feed'
            }, {
                module : Button,
                handler: 'runHeavyCalculation',
                text   : 'Run Heavy Calculation'
            }, {
                module : Button,
                handler: 'runHeavyCalculationInTaskWorker',
                text   : 'Run Heavy Calculation (Task Worker)'
            }, {
                module         : TextField,
                hideLabel      : true,
                placeholderText: 'Type here to test UI responsiveness',
                reference      : 'main-thread-input',
                width          : 230
            }, {
                ntype: 'component',
                cls  : 'spinner'
            }]
        }, {
            module   : BenchmarkGrid,
            flex     : 1,
            reference: 'benchmark-grid'
        }]
    }
}

export default Neo.setupClass(Viewport);
