'use strict';

var angularBootstrap = require('angular-bootstrap');
var app = require('angular').module('admin', ['ui.bootstrap']);
app.controller('BaseCtrl', ['$scope', require('./controllers/BaseCtrl')]);