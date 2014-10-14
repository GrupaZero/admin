'use strict';

var app = require('angular').module('admin', []);
app.controller('BaseCtrl', ['$scope', require('./controllers/BaseCtrl')]);
