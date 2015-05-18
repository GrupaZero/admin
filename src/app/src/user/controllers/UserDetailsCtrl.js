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

function UserDetailsCtrl($scope, $stateParams, UserRepository) {
    // get single user
    UserRepository.one($stateParams.userId).then(function(response) {
        $scope.user = UserRepository.clean(response);
    });
}
UserDetailsCtrl.$inject = ['$scope', '$stateParams', 'UserRepository'];
module.exports = UserDetailsCtrl;
