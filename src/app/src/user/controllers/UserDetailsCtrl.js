'use strict';

function UserDetailsCtrl($scope, $stateParams, UserRepository) {
    // get single user
    UserRepository.one($stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });
}
UserDetailsCtrl.$inject = ['$scope', '$stateParams', 'UserRepository'];
module.exports = UserDetailsCtrl;
