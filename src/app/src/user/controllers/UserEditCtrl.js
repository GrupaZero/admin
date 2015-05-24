/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class UserController
 *
 * @package    Admin
 * @author     Mateusz Urbanowicz <urbanowiczmateusz89@gmail.com>
 * @copyright  Copyright (c) 2015, Mateusz Urbanowicz
 */

'use strict';

function UserDetailsCtrl($scope, $state, $stateParams, UserRepository, Notifications) {
    // get single user
    UserRepository.one($stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });

    $scope.saveUser = function(){
        UserRepository.update($scope.user.id, $scope.user).then(function(response){
            $state.go('user.list');
            Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
        });
    };

}
UserDetailsCtrl.$inject = ['$scope', '$state','$stateParams', 'UserRepository', 'Notifications'];
module.exports = UserDetailsCtrl;
