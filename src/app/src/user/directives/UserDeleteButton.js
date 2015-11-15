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

function UserDeleteButton() {
    return {
        scope: true,
        restrict: 'A',
        controller: 'UserDeleteCtrl',
        controllerAs: 'vm',
        bindToController: true,// because the scope is isolated
        link: function(scope, element, attrs, UserDeleteController) {
            element.on('click', function() {
                // Show a delete modal from a controller
                UserDeleteController.deleteModal.showModal(attrs.userId);
            });
        }
    };
}

UserDeleteButton.$inject = [];
module.exports = UserDeleteButton;
