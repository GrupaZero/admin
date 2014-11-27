'use strict';

angular.module('admin.content', ['ngTable', 'ui.tree'])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/views/content/';
            // Now set up the states
            $stateProvider
                .state('content', {
                    url: '/content',
                    templateUrl: viewPath + 'index.html',
                    controller: 'ContentCtrl'
                })
                .state('content.list', {
                    url: '/list',
                    views: {
                        '': {
                            templateUrl: viewPath + 'list.html'
                        },
                        'quickNav': {
                            templateUrl: viewPath + 'quickNav.html'
                        },
                        'quickSidebarLeft': {
                            templateUrl: viewPath + 'categories.html'
                        }
                    }
                })
                .state('content.show', {
                    url: '/{contentId}/show',
                    templateUrl: viewPath + 'show.html'
                })
                .state('content.add', {
                    url: '/add',
                    templateUrl: viewPath + 'add.html',
                    controller: 'ContentCtrl'
                });
        }
    ])
    .controller('ContentCtrl', require('./controllers/ContentCtrl'))
    .factory('ContentRepository', require('./services/ContentRepository.js'))
    .run([
        '$rootScope',
        function($rootScope) {
            $rootScope.navBar.add(
                {
                    title: 'CONTENT',
                    action: 'content'
                }
            );
            $rootScope.navBar.addLastChild(
                'CONTENT',
                {
                    title: 'ALL_CONTENTS',
                    action: 'content.list'
                }
            );
            $rootScope.navBar.addLastChild(
                'CONTENT',
                {
                    title: 'ADD_NEW',
                    action: 'content.add'
                }
            );
        }
    ]);
