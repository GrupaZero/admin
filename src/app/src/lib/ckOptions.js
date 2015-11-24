'use strict';

function ckOptions() {
    var defaults = {
        toolbarGroups: [
            {name: 'clipboard', groups: ['clipboard', 'undo']},
            {name: 'editing', groups: ['find', 'selection']},
            {name: 'links'},
            {name: 'insert'},
            {name: 'tools'},
            {name: 'document', groups: ['mode', 'document', 'doctools']},
            {name: 'others'},
            '/',
            {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
            {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'bidi']},
            {name: 'align'},
            {name: 'styles'}
        ],
        height: '500px'
    };

    return {
        /**
         * Function adds specified object to the CKEditor options
         *
         * @param object
         */
        setEditorOption: function(object) {
            defaults = _.merge(defaults, object, function(objectValue, sourceValue) {
                if (_.isArray(objectValue)) {
                    return sourceValue;
                }
            });
        },
        /**
         * Function returns CKEditor options
         * @param custom custom option to include in return object, only for this instance of editor
         * @returns {object}
         */
        getEditorOptions: function(custom) {
            var output = _.cloneDeep(defaults);
            angular.forEach(custom, function(value, key) {
                output[key] = value;
            });
            return output;
        }
    };
}

module.$inject = [];
module.exports = ckOptions;
