'use strict';

function ckOptions() {
    var defaults = {
        toolbarGroups: [
            {name: 'insert', groups: ['insert']},
            {name: 'tools'},
            {name: 'links'},
            {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
            {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi']},
            {name: 'styles'},
            {name: 'others'}
        ],
        extraPlugins: 'markdown',
        height: '350px'
    };

    return {
        /**
         * Function adds specified object to the storageItems
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
         * @param custom custom option to include in return object
         * @returns {object}
         */
        getEditorOptions: function(custom) {

            var output = defaults;
            angular.forEach(custom, function(value, key) {
                output[key] = value;
            });

            return output;
        }
    };
}

module.$inject = [];
module.exports = ckOptions;
