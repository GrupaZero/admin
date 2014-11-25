'use strict';

function ContentCtrl($scope, Restangular, $state, ContentRepository, NgTableParams) {
    $scope.contents = {};
    $scope.newContent = {};
    $scope.selectedLang = $scope.currentLang;
    var contents = Restangular.all('admin/contents');

    // Temporary categories list action
    var getCategories = function() {
        ContentRepository.list({lang:  $scope.selectedLang.code, page: 1}).then(function(response) {
            $scope.contents = ContentRepository.clean(response);
        });
    };
    getCategories();

    // Temporary contents list language action
    $scope.selectLanguage = function(lang) {
        $scope.selectedLang = lang;
    };

    $scope.tableParams = new NgTableParams({
        count: 20,         // count per page
        sorting: {
            id: 'asc'     // initial sorting
        }
    }, {
        getData: function($defer, params) {

            // prepare options to be sent to api
            var queryOptions = {
                lang: $scope.selectedLang.code,
                page: params.page()
            };

            // tableParams.orderBy() - an array of string indicating both the sorting column and direction (e.g. ["+name", "-email"])
            if (params.sorting()) {
                // only interested in first sort column for now
                var orderBy = params.orderBy()[0];
                queryOptions.sort = orderBy[0] === '+' ? orderBy.substring(1) : orderBy;
            }

            // params.filter() - array of key-value filters declared in view
            //queryOptions.filter = params.filter();

            console.log(queryOptions); //TODO remove console.log
            // Contents is a REST AngularJS service that talks to api and return promise
            ContentRepository.list(queryOptions).then(function(response) {
                params.total(response.meta.total);
                $defer.resolve(ContentRepository.clean(response));
                $scope.meta = response.meta;
                console.log(response.meta); //TODO remove console.log
            });
        }
    });

    // Temporary contents POST action
    $scope.addNewContent = function addNewContent(newContent) {
        newContent.lang = {
            code: $scope.currentLang.code,
            i18n: $scope.currentLang.i18n
        };

        contents.post(newContent).then(function() {
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
