'use strict';

angular.module('admin.content', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/views/content/';
            var dummyController = [
                '$scope', '$stateParams', function ($scope, $stateParams) {
                    $scope.content = {
                        'translations': [
                            {
                                'id': '1',
                                'url': 'dummy-content2',
                                'langCode': 'pl',
                                'title': 'Dummy content2 title',
                                'body': 'Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui. ',
                            }
                        ]
                    };
                }
            ];

            // Now set up the states
            $stateProvider
                .state('content', {
                    url: '/content',
                    views: {
                        'index': {
                            templateUrl: viewPath + 'index.html'
                        }
                    }
                })
                .state('content.list', {
                    url: '/list',
                    views: {
                        'index@': {
                            templateUrl: viewPath + 'list.html'
                        },
                        'quickNav@': {
                            templateUrl: viewPath + 'quickNav.html',
                            controller: 'ContentCtrl'
                        }
                    }
                })
                .state('content.show', {
                    url: '/{contentId}/show',
                    views: {
                        'index@': {
                            templateUrl: viewPath + 'show.html',
                            controller: dummyController
                        }
                    }

                })
                .state('content.show.edit', {
                    url: '/{translationId}/edit',
                    templateUrl: viewPath + 'edit.html',
                    controller: dummyController
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
