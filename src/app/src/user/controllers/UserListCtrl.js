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

function UserListCtrl($scope, Utils, $rootScope, UserRepository, NgTableParams) {
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'id': 'desc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code,
                type: 'user'
            };

            // params.count() - number of items per page declared in view
            if (typeof Utils.$stateParams.perPage !== 'undefined') {
                params.count(Utils.$stateParams.perPage);
                queryOptions.perPage = params.count();
            }

            // params.page() - current page
            if (typeof Utils.$stateParams.page !== 'undefined') {
                params.page(Utils.$stateParams.page);
                queryOptions.page = params.page();
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // get list by default
            var promise = UserRepository.list(queryOptions);

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(UserRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

UserListCtrl.$inject = ['$scope', 'Utils', '$rootScope', 'UserRepository', 'ngTableParams'];
module.exports = UserListCtrl;
