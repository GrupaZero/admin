/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FileController
 *
 * @package    Admin
 */

'use strict';

function FilesListCtrl($scope, Utils, FilesRepository, NgTableParams) {
    // TODO: file add button links for other types
    $scope.fileAddButtonLinks = [
        {
            text: 'ADD_IMAGES',
            href: 'files.add({ type: "image" })',
            icon: 'fa fa-file-image-o'

        },
        {
            text: 'ADD_DOCUMENTS',
            href: 'files.add({ type: "document" })',
            icon: 'fa fa-file-pdf-o'
        }
    ];

    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'translations.title': 'asc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            $scope.requestPending = true;
            // prepare options to be sent to api
            var queryOptions = {
                lang: Utils.Config.defaultLangCode
            };

            // lang sort options
            if (typeof $scope.transLang !== 'undefined') {
                queryOptions.lang = $scope.transLang.code;
            }

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

            // Utils.$stateParams - filters from state params
            var filters = Utils.$stateParams;
            queryOptions = _.merge(queryOptions, filters);
            $scope.activeFilter = filters;

            // get list by default
            var promise = FilesRepository.list(queryOptions);

            // Promise is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                $scope.requestPending = false;
                params.total(response.meta.total);
                $defer.resolve(FilesRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}

FilesListCtrl.$inject = ['$scope', 'Utils', 'FilesRepository', 'ngTableParams'];
module.exports = FilesListCtrl;
