'use strict';

function ContentCtrl($scope, Restangular, $state, ContentRepository, NgTableParams) {
    $scope.contents = {};
    $scope.newContent = {};
    $scope.listLang = $scope.currentLang;
    $scope.categoryId = 0;

    // Temporary contents list language action
    $scope.selectLanguage = function(lang) {
        $scope.listLang = lang;
        $scope.tableParams.reload();
    };

    // Temporary contents list language action
    $scope.selectCategory = function(id) {
        $scope.categoryId = id;
        $scope.tableParams.reload();
    };

    //  ngTable configuration
    $scope.tableParams = new NgTableParams({
        count: 25,         // count per page
        sorting: {
            id: 'asc'     // initial sorting
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

            // get uncategorized
            var promise = ContentRepository.list(queryOptions);

            // if parent category is selected
            if ($scope.categoryId) {
                // get children's
                delete queryOptions.level; // remove level param
                promise = Restangular.one('admin/contents', $scope.categoryId).getList('children', queryOptions);
            }

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // params.filter() - array of key-value filters declared in view
            if (params.filter()) {
                var filter = params.filter();
                queryOptions = angular.extend(queryOptions, filter);
                $scope.activeFilter = Object.getOwnPropertyNames(filter);
            }

            // params.count() - number of items per page declared in view
            if (params.count()) {
                queryOptions.perPage = params.count();
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
    var getCategories = function() {
        ContentRepository.list({lang: $scope.listLang.code, type: 'category', level: 0}).then(function(response) {
            $scope.categories = ContentRepository.clean(response);
        });
    };

    // Temporary categories list tree toggle children action
    $scope.toggleChildren = function(scope) {
        if (!scope.$nodeScope.$modelValue.children) {
            var category = Restangular.one('admin/contents', scope.$nodeScope.$modelValue.id);
            category.getList('children', {lang: $scope.listLang.code, type: 'category'}).then(function(response) {
                if (ContentRepository.clean(response).length > 0) {
                    scope.$nodeScope.$modelValue.children = ContentRepository.clean(response);
                }
            });
        }
        $scope.selectCategory(scope.$nodeScope.$modelValue.id);
        scope.toggle();
    };

    getCategories();

    // Temporary contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.lang = {
            code: $scope.currentLang.code,
            i18n: $scope.currentLang.i18n
        };

        Restangular.all('admin/contents').post(newContent).then(function() {
            $state.go('content.list');
        }, function() {
            $scope.message = {
                code: 'danger',
                text: 'There was an error saving!'
            };
        });
    };

}

ContentCtrl.$inject = ['$scope', 'Restangular', '$state', 'ContentRepository', 'ngTableParams'];
module.exports = ContentCtrl;
