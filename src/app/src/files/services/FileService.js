'use strict';

function FileService(Utils) {
    return {
        /**
         * Returns merged file data with provided defaults
         *
         * @param file file data
         * @param defaults default file settings to merge with
         * @returns Object merged file data with defaults
         */
        prepareRequestData: function(file, defaults) {
            var output = {
                file: file
            };
            // set translations if there any of them is filled, because translations are not required.
            if (typeof file.translations !== 'undefined') {
                output.translations = file.translations;
            } else {
                defaults = _.omit(defaults, ['translations']);
            }
            return _.merge(defaults, output);
        },
        /**
         * Returns file extensions pattern for ng-file-upload validator e.g. '.png,.jpg,.jpeg,.tif'
         *
         * @param type file type
         * @returns string type file extensions pattern for ng-file-upload validator
         */
        getTypeExtensionsPattern: function(type) {
            return '.' + _.join(Utils.Config.fileExtensions[type], ',.');
        }
    };
}

FileService.$inject = ['Utils'];
module.exports = FileService;
