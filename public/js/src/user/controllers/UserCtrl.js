'use strict';

function UserCtrl($scope, $rootScope, Restangular) {
    console.log('UserCtrl loaded');
    var users = Restangular.all('users');

    $rootScope.$broadcast('test');
    users.getList().then(function (contents) {
        $scope.contents = contents;
    });
}

UserCtrl.$inject = ['$scope', '$rootScope', 'Restangular'];
module.exports = UserCtrl;
