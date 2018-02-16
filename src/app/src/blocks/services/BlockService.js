'use strict';

function BlockService() {
    return {
        prepareRequestData: function(block) {
            // handle block filter
            if (block.filter !== null && typeof block.filter !== 'undefined') {
                // set empty filter values if not exists
                if (!('+' in block.filter)) {
                    block.filter['+'] = [];
                }
                if (!('-' in block.filter)) {
                    block.filter['-'] = [];
                }
                // handle empty block filter
                if (block.filter['+'].length === 0 && block.filter['-'].length === 0) {
                    block.filter = null;
                }
            }
            // handle block translation custom fields
            if (block.translations !== null && typeof block.translations !== 'undefined') {
                if (block.translations.custom_fields === null) {
                    block.translations.custom_fields = [];
                }

                block.title = block.translations.title;
                block.body = block.translations.body;
                block.custom_fields = block.translations.custom_fields;
            }
            return block;
        }
    };
}

BlockService.$inject = [];
module.exports = BlockService;
