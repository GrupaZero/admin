'use strict';

angular.module('admin.user', [])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {

            var viewPath = 'packages/gzero/admin/js/src/user/views/';

            // Now set up the states
            $stateProvider
                .state('user', {
                    url: "/user",
                    templateUrl: viewPath + "list.html"
                });
        }
    ]).controller('UserCtrl', require('./controllers/UserCtrl'));
