'use strict';

function ContentCtrl($scope, Restangular, $state, $stateParams, ContentRepository, NgTableParams, Notifications) {
    $scope.contents = {};
    $scope.newContent = {};
    $scope.listLang = $scope.currentLang;

    // Temporary contents list language action
    $scope.selectLanguage = function(lang) {
        $scope.listLang = lang;
        $scope.tableParams.reload();
    };

    // Temporary contents list select category action
    $scope.selectCategory = function(id) {
        if (id) {
            ContentRepository.one(id).then(function(response) {
                $scope.listParent = ContentRepository.clean(response); // select category
                // reload contents list
                $scope.tableParams.reload();
            });
        } else {
            $scope.listParent = null; // uncategorized
            // reload contents list
            $scope.tableParams.reload();
        }
    };

    //  ngTable configuration
    $scope.tableParams = new NgTableParams({
        count: 25, // count per page
        sorting: {
            id: 'asc' // initial sorting
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
            if ($scope.listParent) {
                // get children's
                delete queryOptions.level; // remove level param
                promise = ContentRepository.children($scope.listParent.id, queryOptions);
            }

            // Contents is a REST AngularJS service that talks to api and return promise
            promise.then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
            });
        }
    });

    // Categories tree

    // Temporary categories list action
    var categories = $scope.categories = Restangular.all('admin/contents').getList({
        lang: $scope.listLang.code,
        type: 'category',
        level: 0
    }).$object;

    // Temporary categories list tree toggle children action
    $scope.toggleChildren = function(scope) {
        if (!scope.$nodeScope.$modelValue.children) {
            ContentRepository.children(scope.$nodeScope.$modelValue.id, {
                lang: $scope.listLang.code,
                type: 'category'
            }).then(function(response) {
                if (ContentRepository.clean(response).length > 0) {
                    scope.$nodeScope.$modelValue.children = ContentRepository.clean(response);
                }
            });
        }
        $scope.selectCategory(scope.$nodeScope.$modelValue.id);
        scope.toggle();
    };

    // Temporary contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.lang = {
            code: $scope.currentLang.code,
            i18n: $scope.currentLang.i18n
        };
        newContent.type = $stateParams.type;
        newContent.isActive = 1;

        categories.post(newContent).then(function onSuccess(response) {
            categories.push(response);
            setTimeout(function() {
                console.log($scope.categories);
                $state.go('content.list');
            }, 500);
        });
    };

}
ContentCtrl.$inject = ['$scope', 'Restangular', '$state', '$stateParams', 'ContentRepository', 'ngTableParams', 'Notifications'];
module.exports = ContentCtrl;
