function Navigation() {
    var items = [];
    return {
        add: function (item) {
            items.push(item);
        },
        getItems: function () {
            return items;
        }
    }
}

module.exports = Navigation;
