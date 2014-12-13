'use strict';

angular.module('admin.content', ['ngTable', 'ui.tree'])
    .config([
        '$stateProvider',
        function($stateProvider) {
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
                    resolve: {
                        listParent: [
                            '$stateParams', 'Storage', 'ContentRepository', function($stateParams, Storage, ContentRepository) {
                                // if state param has category id
                                if ($stateParams.contentId) {
                                    return ContentRepository.one($stateParams.contentId);
                                } else {
                                    // if storage has category id
                                    if (Storage.getListParam('contentListParent')) {
                                        $stateParams.contentId = Storage.getListParam('contentListParent');
                                        return ContentRepository.one(Storage.getListParam('contentListParent'));
                                    }
                                }
                            }
                        ]
                    },
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
                    views: {
                        'content': {
                            templateUrl: viewPath + 'show.html',
                            controller: 'ContentDetailsCtrl'
                        }
                    }
                })
                .state('content.add', {
                    url: '/add/{type}',
                    controller: 'ContentAddCtrl',
                    views: {
                        'content': {
                            templateUrl: viewPath + 'add.html',
                            controller: 'ContentListCtrl'
                        }
                    }
                });
        }
    ])
    .controller('ContentAddCtrl', require('./controllers/ContentAddCtrl'))
    .controller('ContentCategoryTreeCtrl', require('./controllers/ContentCategoryTreeCtrl'))
    .controller('ContentDashboardCtrl', require('./controllers/ContentDashboardCtrl'))
    .controller('ContentDetailsCtrl', require('./controllers/ContentDetailsCtrl'))
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
                    title: 'ADD_CONTENT',
                    action: 'content.add({ type: "content" })'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ADD_CATEGORY',
                    action: 'content.add({ type: "category" })'
                }
            );
        }
    ]);
