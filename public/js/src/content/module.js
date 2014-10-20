'use strict';

angular.module('admin.content', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/js/src/content/views/';

            // Now set up the states
            $stateProvider
                .state('content', {
                    url: "/content/list",
                    templateUrl: viewPath + "list.html"
                })
                .state('content-show', {
                    url: "/content/{contentId}/show",
                    templateUrl: viewPath + "show.html",
                    controller: [
                        '$scope', '$stateParams', function ($scope, $stateParams) {
                            // get the id
                            $scope.id = $stateParams.contentId;
                        }
                    ]
                });

            //RestangularProvider.setBaseUrl('/api/v1');
            //RestangularProvider.setResponseExtractor(function (response, operation) {
            //    return response.data;
            //});
        }
    ]).controller('ContentCtrl', require('./controllers/ContentCtrl'));
