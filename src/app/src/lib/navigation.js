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
        addBefore: function(title, newitem) {
            _.forEach(items, function(value, index){
                if(value.title === title){
                    items.splice(index, 0, newitem);
                    return false;
                }
            });
        },
        addAfter: function(title, newitem) {
            _.forEach(items, function(value, index){
                if(value.title === title){
                    items.splice(index + 1, 0, newitem);
                    return false;
                }
            });
        },
        getItems: function() {
            return items;
        }
    };
}
module.exports = Navigation;
