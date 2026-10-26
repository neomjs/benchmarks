import BaseViewport from '../../../node_modules/neo.mjs/src/container/Viewport.mjs';

/**
 * @summary Starter Viewport shell for Arm B (`neo-kb-only`).
 * @class GridBench.view.Viewport
 * @extends Neo.container.Viewport
 */
class Viewport extends BaseViewport {
    static config = {
        className: 'GridBench.view.Viewport',
        items    : [{
            ntype: 'component',
            html : 'Arm B Starter — Implement grid-100k-multi-window'
        }]
    }
}

export default Neo.setupClass(Viewport);
