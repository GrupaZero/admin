'use strict';

function ContentCategoryTreeCtrl($scope, categories, listParent, Storage, ContentRepository) {
    /**
     * Function returns root id from provided path
     *
     * @param path to search over
     *
     * @returns {int} root id
     * @throws Error
     */
    function getRootIdFromPath(path) {
        if (path.length > 0) {
            return path[0];
        } else {
            throw new Error('Node path is too short!');
        }
    }

    /**
     * Function returns specified node form provided collection
     *
     * @param collection the collection to iterate over
     * @param id  node id
     *
     * @returns {object} returns the found element, else undefined
     */
    function getNodeById(collection, id) {
        return _.find(collection, function(category) {
            return category.id === id;
        });
    }

    /**
     * Function gets nested children of selected category
     *
     * @param root root node to search for children
     * @param path the path to iterate over
     */
    function getNestedChildren(root, path) {
        if (typeof root !== 'undefined') {
            ContentRepository.children(path.shift(), {
                lang: $scope.listLang.code,
                type: 'category'
            }).then(function(response) {
                root.children = ContentRepository.clean(response);
                if (path.length > 0) {
                    // We can use it because each iteration removes id from path
                    getNestedChildren(getNodeById(root.children, getRootIdFromPath(path)), path);
                }
            });
        }
    }

    // if categories tree exists
    if (typeof categories !== 'undefined') {
        $scope.categories = categories;
    }

    // if parent category exists
    if (typeof listParent !== 'undefined') {
        $scope.activeNode = listParent;
        $scope.root = getNodeById($scope.categories, getRootIdFromPath(listParent.path));
        getNestedChildren($scope.root, _.clone(listParent.path));
    }

    // removes listParent id from storage
    $scope.uncategorized = function() {
        Storage.removeStorageItem('contentListParent');
    };

}
ContentCategoryTreeCtrl.$inject = ['$scope', 'categories', 'listParent', 'Storage', 'ContentRepository'];
module.exports = ContentCategoryTreeCtrl;
