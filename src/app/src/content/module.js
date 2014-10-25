'use strict';

angular.module('admin.content', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/views/content/';

            // Now set up the states
            $stateProvider
                .state('content', {
                    url: "/content",
                    views: {
                        "index": {
                            templateUrl: viewPath + "index.html"
                        }
                    }
                })
                .state('content.list', {
                    url: "/list",
                    views: {
                        "index@": {
                            templateUrl: viewPath + "list.html"
                        }
                    }
                })
                .state('content.show', {
                    url: "/{contentId}/show",
                    views: {
                        "index@": {
                            templateUrl: viewPath + "show.html",
                            controller: [
                                '$scope', '$stateParams', function ($scope, $stateParams) {
                                    // get the ids
                                    $scope.id = $stateParams.contentId;
                                }
                            ]
                        }
                    }

                });
        }
    ])
    .controller('ContentCtrl', require('./controllers/ContentCtrl'))
    .run([
        '$rootScope',
        function ($rootScope) {
            $rootScope.navBar.add({
                title: 'CONTENT', action: 'content', children: [
                    {title: 'CONTENT_LIST', action: 'content.list'}
                ]
            });
        }
    ]);
