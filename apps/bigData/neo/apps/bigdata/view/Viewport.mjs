import BaseViewport          from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';
import ControlsContainer from './ControlsContainer.mjs';
import GridContainer     from './GridContainer.mjs';

/**
 * @class BigData.view.Viewport
 * @extends Neo.container.Viewport
 */
class Viewport extends BaseViewport {
    static config = {
        /**
         * @member {String} className='BigData.view.Viewport'
         * @protected
         */
        className: 'BigData.view.Viewport',
        /**
         * @member {String[]} cls=['bigdata-viewport']
         * @reactive
         */
        cls: ['bigdata-viewport'],
        /**
         * @member {Object} layout={ntype:'hbox',align:'stretch'}
         * @reactive
         */
        layout: {ntype: 'hbox', align: 'stretch'},
        /**
         * @member {Object[]} items
         */
        items: [{
            module   : GridContainer,
            reference: 'grid'
        }, {
            module: ControlsContainer
        }]
    }

    /**
     * @param {Object} opts
     */
    onThemeRadioChange({value}) {
        this.theme = value
    }
}

export default Neo.setupClass(Viewport);
