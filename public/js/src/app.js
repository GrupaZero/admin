'use strict';

require('./content/module.js');
require('./user/module.js');

angular.module('admin', ['restangular', 'ui.router', 'admin.content', 'admin.user'])
    .config([
        '$stateProvider',
        '$urlRouterProvider',
        'RestangularProvider',
        function ($stateProvider, $urlRouterProvider, RestangularProvider) {
            var viewPath = 'packages/gzero/admin/js/views/';

            // For any unmatched url, redirect to /state1
            $urlRouterProvider.otherwise("/");

            // Now set up the states
            $stateProvider
                .state('home', {
                    url: "/",
                    templateUrl: viewPath + "home.html"
                });

            RestangularProvider.setBaseUrl('/api/v1');
            RestangularProvider.setResponseExtractor(function (response, operation) {
                return response.data;
            });
        }
    ]).run([
        '$rootScope',
        function ($rootScope) {
            $rootScope.$on('test', function (event, args) {
                console.log('Test event');
            });
        }
    ]);
