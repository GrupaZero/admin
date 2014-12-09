'use strict';

function ContentListCtrl($scope, $stateParams, Storage, ContentRepository, NgTableParams) {
    // if state param has category id
    if ($stateParams.contentId) {
        ContentRepository.one($stateParams.contentId).then(function(response) {
            $scope.listParent = ContentRepository.clean(response); // selected category
            Storage.setListParam({contentListParent: $scope.listParent.id});
        });
    }

    //  ngTable configuration
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            'translations.title': 'asc' // initial sorting
        }
    }, {
        total: 0, // length of data
        getData: function($defer, params) {
            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.listLang.code,
                type: 'content',
                level: 0,
                page: params.page()
            };

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // params.filter() - array of key-value filters declared in view
            if (params.filter()) {
                var filter = params.filter();
                queryOptions = _.merge(queryOptions, filter);
                $scope.activeFilter = Object.getOwnPropertyNames(filter);
            }

            // params.count() - number of items per page declared in view
            if (params.count()) {
                queryOptions.perPage = params.count();
            }

            // get uncategorized by default
            var promise = ContentRepository.list(queryOptions);

            // if parent category is selected
            if ($stateParams.contentId) {
                // get children's
                delete queryOptions.level; // remove level param
                promise = ContentRepository.children($stateParams.contentId, queryOptions);
            }

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });
}
ContentListCtrl.$inject = ['$scope', '$stateParams', 'Storage', 'ContentRepository', 'ngTableParams'];
module.exports = ContentListCtrl;
