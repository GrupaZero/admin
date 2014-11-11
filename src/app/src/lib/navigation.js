function Navigation() {
    'use strict';

    var items = [];
    return {
        add: function(item) {
            items.push(item);
        },
        addFirst: function(item) {
            items.unshift(item);
        },
        getItems: function() {
            return items;
        }
    };
}
module.exports = Navigation;
