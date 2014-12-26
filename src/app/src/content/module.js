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
                    templateUrl: viewPath + 'index.html',
                    resolve: {
                        categories: [
                            'ContentRepository', function(ContentRepository) {
                                // get root level categories
                                return ContentRepository.list({
                                    type: 'category',
                                    perPage: 125,
                                    level: 0
                                });
                            }
                        ]
                    }
                })
                .state('content.list', {
                    url: '/list/{contentId}?isActive&page',
                    resolve: {
                        listParent: [
                            '$stateParams', 'Storage', 'ContentRepository', function($stateParams, Storage, ContentRepository) {
                                // if state param has category id
                                if ($stateParams.contentId) {
                                    Storage.setStorageItem({contentListParent: $stateParams.contentId});
                                    return ContentRepository.one($stateParams.contentId);
                                } else {
                                    // if storage has category id
                                    if (Storage.getStorageItem('contentListParent')) {
                                        $stateParams.contentId = Storage.getStorageItem('contentListParent');
                                        return ContentRepository.one(Storage.getStorageItem('contentListParent'));
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
                    resolve: {
                        listParent: [
                            'Storage', 'ContentRepository', function(Storage, ContentRepository) {
                                // if storage has category id
                                if (Storage.getStorageItem('contentListParent')) {
                                    return ContentRepository.one(Storage.getStorageItem('contentListParent'));
                                }
                            }
                        ]
                    },
                    views: {
                        'content': {
                            templateUrl: viewPath + 'add.html',
                            controller: 'ContentAddCtrl'
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
                    action: 'content',
                    icon: 'fa fa-file-text-o'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ALL_CONTENTS',
                    action: 'content.list',
                    icon: 'fa fa-th'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ADD_CONTENT',
                    action: 'content.add({ type: "content" })',
                    icon: 'fa fa-file-text-o'
                }
            );
            NavBar.addLastChild(
                'CONTENT',
                {
                    title: 'ADD_CATEGORY',
                    action: 'content.add({ type: "category" })',
                    icon: 'fa fa-file-text'
                }
            );
        }
    ]);
