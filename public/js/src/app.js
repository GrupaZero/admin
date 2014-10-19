'use strict';

window._ = require('lodash');
require('angular-bootstrap');
require('restangular');
require('angular')
    .module('admin', ['ui.bootstrap', 'restangular', require('angular-ui-router')])
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
                })
                .state('content-list', {
                    url: "/content/list",
                    templateUrl: viewPath + "content/list.html",
                    controller: "BaseCtrl"
                })
                .state('content-show', {
                    url: "/content/{contentId}/show",
                    templateUrl: viewPath + "content/show.html",
                    controller: [
                        '$scope', '$stateParams', function ($scope, $stateParams) {
                            // get the id
                            $scope.id = $stateParams.contentId;
                        }
                    ]
                });

            RestangularProvider.setBaseUrl('/api/v1');
            RestangularProvider.setResponseExtractor(function (response, operation) {
                return response.data;
            });
        }
    ]).controller('BaseCtrl', ['$scope', 'Restangular', require('./controllers/BaseCtrl')]);
