'use strict';

window._ = require('lodash');
require('angular-bootstrap');
require('restangular');

var app = require('angular')
    .module('admin', ['ui.bootstrap', 'restangular'])
    .config([
        'RestangularProvider', function (RestangularProvider) {
            RestangularProvider.setBaseUrl('/api/v1');
            RestangularProvider.setResponseExtractor(function(response, operation) {
                return response.data;
            });
        }
    ]);
app.controller('BaseCtrl', ['$scope', 'Restangular', require('./controllers/BaseCtrl')]);
