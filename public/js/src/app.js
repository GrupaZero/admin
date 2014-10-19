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

            // For any unmatched url, redirect to /state1
            $urlRouterProvider.otherwise("/");

            // Now set up the states
            $stateProvider
                .state('state1', {
                    url: "/state1",
                    templateUrl: "partials/state1.html"
                })
                .state('state1.list', {
                    url: "/list",
                    templateUrl: "partials/state1.list.html",
                    controller: function ($scope) {
                        $scope.items = ["A", "List", "Of", "Items"];
                    }
                })
                .state('state2', {
                    url: "/state2",
                    templateUrl: "partials/state2.html"
                })
                .state('state2.list', {
                    url: "/list",
                    templateUrl: "partials/state2.list.html",
                    controller: function ($scope) {
                        $scope.things = ["A", "Set", "Of", "Things"];
                    }
                });

            RestangularProvider.setBaseUrl('/api/v1');
            RestangularProvider.setResponseExtractor(function (response, operation) {
                return response.data;
            });
        }
    ]).controller('BaseCtrl', ['$scope', 'Restangular', require('./controllers/BaseCtrl')]);
