'use strict';

angular.module('admin.content', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/views/content/';
            var dummyController = [
                '$scope', '$stateParams', 'LangRepository', function($scope, $stateParams, LangRepository) {
                    $scope.content = {
                        'id': 2,
                        'typeName': 'category',
                        'isActive': true,
                        'weight': 0,
                        'path': '/',
                        'level': 0,
                        'createdAt': {
                            'date': '2014-10-12 17:35:59',
                            'timezone_type': 3,
                            'timezone': 'UTC'
                        },
                        'translations': [
                            {
                                'id': '1',
                                'url': 'szybki-brazowy-lis-przeskoczyl-nad-leniwym-psem',
                                'langCode': 'pl',
                                'title': 'Szybki brązowy lis przeskoczył nad leniwym psem',
                                'body': 'Donec id elit non mi porta gravida at eget metus. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh, ut fermentum massa justo sit amet risus. Etiam porta sem malesuada magna mollis euismod. Donec sed odio dui. '
                            }, {
                                'id': '2',
                                'url': 'the-quick-brown-fox-jumps-over-the-lazy-dog',
                                'langCode': 'en',
                                'title': 'The quick brown fox jumps over the lazy dog',
                                'body': 'Vivamus id urna et ipsum porta tempor. Sed laoreet ipsum quis nisi consectetur, vel commodo nisl hendrerit. Ut posuere eros quis nisi euismod maximus. Cras id hendrerit velit. Donec id vulputate libero.'
                            }
                        ]
                    };
                    LangRepository.all().then(function(data) {
                        $scope.langs = data;
                    });
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
                            templateUrl: viewPath + 'list.html',
                            controller: 'ContentCtrl'
                        },
                        'quickNav@': {
                            templateUrl: viewPath + 'quickNav.html'
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
                .state('content.add', {
                    url: '/add',
                    views: {
                        'index@': {
                            templateUrl: viewPath + 'add.html',
                            controller: 'ContentCtrl'
                        }
                    }
                });
        }
    ])
    .controller('ContentCtrl', require('./controllers/ContentCtrl'))
    .run([
        '$rootScope',
        function($rootScope) {
            $rootScope.navBar.add({
                title: 'CONTENT', action: 'content', children: [
                    {title: 'CONTENT_LIST', action: 'content.list'}
                ]
            });
        }
    ]);
