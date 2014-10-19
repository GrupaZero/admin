'use strict';

module.exports = function BaseCtrl ($scope, Restangular) {
    var contents = Restangular.all('contents');

    contents.getList().then(function(contents) {
        $scope.contents = contents;
    });
};
