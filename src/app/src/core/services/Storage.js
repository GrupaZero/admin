'use strict';

function Storage() {
    var listParams = {};
    return {
        /**
         * Function adds specified object to the listParams
         *
         * @param object
         */
        setListParam: function(object) {
            _.merge(listParams, object);
        },
        /**
         * Function returns the specified object from the listParams
         *
         * @param index
         * @returns {object}
         */
        getListParam: function(index) {
            return listParams[index];
        },
        /**
         * Function removes specified object from the listParams
         *
         * @param index
         * @returns {object}
         */
        removeListParam: function(index) {
            delete listParams[index];
        }
    };
}

Storage.$inject = [];
module.exports = Storage;
