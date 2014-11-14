function Navigation() {
    'use strict';

    var items = [];

    /**
     * Function checks if 'item' structure is valid
     *
     * @param item
     * @returns {boolean}
     */
    var checkStructure = function(item) {
        if (!_.has(item, 'title')) {
            throw new Error('Property: ' + 'title' + ' is missing');
        } else if (!_.has(item, 'action') && !_.has(item, 'href')) {
            throw new Error('Property: ' + '\'action\' or \'href\'' + ' are required');
        }
        return true;
    };

    return {
        add: function(item) {
            if (checkStructure(item)) {
                items.push(item);
            }
        },
        addFirst: function(item) {
            if (checkStructure(item)) {
                items.unshift(item);
            }
        },
        /**
         * Function adds 'newItem' of menu before explicit specified by 'title'
         *
         * @param title
         * @param newItem
         */
        addBefore: function(title, newItem) {
            if (checkStructure(newItem)) {
                _.forEach(items, function(value, index) {
                    if (value.title === title) {
                        items.splice(index, 0, newItem);
                        return false;
                    }
                });
            }

        },
        /**
         * Function adds 'newItem' of menu after explicit specified by 'title'
         *
         * @param title
         * @param newItem
         */
        addAfter: function(title, newItem) {
            if (checkStructure(newItem)) {
                _.forEach(items, function(value, index) {
                    if (value.title === title) {
                        items.splice(index + 1, 0, newItem);
                        return false;
                    }
                });
            }
        },
        getItems: function() {
            return items;
        },
        /**
         * Function exports links to 'target' menu
         *
         * @returns {Array}
         */
        exportToTargetMenu: function() {
            var results = [];
            var newItem = {};
            _.forEach(items, function(value) {
                _.forIn(value, function(value, key) {
                    if (key === 'title') {
                        newItem.text = value;
                    } else if (key === 'action') {
                        newItem.href = value;
                    } else {
                        newItem[key] = value;
                    }
                });
                results.push(newItem);
                newItem = {};
            });
            return results;
        },
        /**
         * Function exports links to 'action' menu
         *
         * @returns {Array}
         */
        exportToActionMenu: function() {
            var results = [];
            var newItem = {};
            _.forEach(items, function(value) {
                _.forIn(value, function(value, key) {
                    if (key === 'href') {
                        newItem.action = value;
                    } else {
                        newItem[key] = value;
                    }
                });
                results.push(newItem);
                newItem = {};
            });
            return results;
        }
    };
}
module.exports = Navigation;
