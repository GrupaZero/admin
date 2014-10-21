'use strict';

function ContentCtrl($scope, $rootScope, Restangular) {
    console.log('ContentCtrl loaded');
    var contents = Restangular.all('contents');

    contents.getList().then(function (contents) {
        $scope.contents = contents;
    });
}

ContentCtrl.$inject = ['$scope', '$rootScope', 'Restangular'];
module.exports = ContentCtrl;
