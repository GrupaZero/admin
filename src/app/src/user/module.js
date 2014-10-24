'use strict';

angular.module('admin.user', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/views/user/';

            // Now set up the states
            $stateProvider
                .state('user', {
                    url: "/user",
                    views: {
                        "index": {
                            templateUrl: viewPath + "list.html"
                        }
                    }
                });
        }
    ])
    .controller('UserCtrl', require('./controllers/UserCtrl'))
    .run([
        '$rootScope',
        function ($rootScope) {
            $rootScope.navBar.add({title: 'User', action: 'user'});
        }
    ]);

