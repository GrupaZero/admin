'use strict';

function ContentCtrl($scope, $state, $stateParams, ContentRepository, NgTableParams) {
    $scope.contents = {};
    $scope.newContent = {};
    $scope.listLang = $scope.currentLang;
    $scope.listParent = null; // uncategorized

    console.log($stateParams);
    // if state param has category id
    if ($stateParams.categoryId) {
        ContentRepository.one($stateParams.categoryId).then(function(response) {
            $scope.listParent = ContentRepository.clean(response); // select category
        });
    }

    // contents list language action
    $scope.selectLanguage = function(lang) {
        $scope.listLang = lang;
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

    // get categories tree root level
    ContentRepository.list({
        lang: $scope.listLang.code,
        type: 'category',
        perPage: 125,
        level: 0
    }).then(function(response) {
        $scope.categories = response;
    });

    // Categories list tree toggle children action
    $scope.toggleChildren = function(scope) {
        if (!scope.$nodeScope.$modelValue.children) { // only if there is no children's
            ContentRepository.children(scope.$nodeScope.$modelValue.id, {
                lang: $scope.listLang.code,
                type: 'category'
            }).then(function(response) {
                if (ContentRepository.clean(response).length > 0) {
                    scope.$nodeScope.$modelValue.children = ContentRepository.clean(response);
                }
            });
        }
        scope.toggle();
    };

    // contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        _.merge(newContent.translations, {
            langCode: $scope.listLang.code,
            isActive: 1
        });
        newContent.type = $state.params.type;
        newContent.isActive = 1;
        $scope.categories.post(newContent).then(function onSuccess(response) {
            setTimeout(function() {
                $scope.$apply(function() {
                    $scope.categories.push(response);
                    $state.go('content.list');
                });
            }, 1000);
        });
    };

}
ContentCtrl.$inject = ['$scope', '$state', '$stateParams', 'ContentRepository', 'ngTableParams'];
module.exports = ContentCtrl;
