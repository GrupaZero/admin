'use strict';

module.exports = function BaseCtrl ($scope, Restangular) {
    var contents = Restangular.all('contents');

    contents.getList().then(function(contents) {
        $scope.contents = contents;
    });

    $scope.testVar = 'We are up and running from a required module!';
    $scope.alerts = [
        { type: 'danger', msg: 'Oh snap! Change a few things up and try submitting again.' },
        { type: 'success', msg: 'Well done! You successfully read this important alert message.' }
    ];
    $scope.addAlert = function() {
        $scope.alerts.push({msg: 'Another alert!'});
    };

    $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    };
};
