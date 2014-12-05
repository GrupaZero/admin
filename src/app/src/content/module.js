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
                    controller: 'ContentDashboardCtrl',
                    templateUrl: viewPath + 'index.html'
                })
                .state('content.list', {
                    url: '/list/{contentId}',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'list.html',
                            controller: 'ContentListCtrl'
                        },
                        'quickSidebarLeft': {
                            templateUrl: viewPath + 'categories.html',
                            controller: 'ContentCategoryTreeCtrl'
                        }
                    }
                })
                .state('content.show', {
                    url: '/{contentId}/show',
                    templateUrl: viewPath + 'show.html'
                })
                .state('content.add', {
                    url: '/add/{type}',
                    templateUrl: viewPath + 'add.html'
                });
        }
    ])
    .controller('ContentDashboardCtrl', require('./controllers/ContentDashboardCtrl'))
    .controller('ContentListCtrl', require('./controllers/ContentListCtrl'))
    .controller('ContentCategoryTreeCtrl', require('./controllers/ContentCategoryTreeCtrl'))
    .controller('ContentListCtrl', require('./controllers/ContentListCtrl'))
    .factory('ContentRepository', require('./services/ContentRepository.js'))
    .run([
        'NavBar',
        function(NavBar) {
            NavBar.add(
                {
                    title: 'CONTENT',
                    action: 'content'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ALL_CONTENTS',
                    action: 'content.list'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ADD_NEW',
                    action: 'content.add'
                }
            );
        }
    ]);
