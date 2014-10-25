'use strict';

function ContentCtrl($scope, $rootScope, Restangular) {
    console.log('ContentCtrl loaded');
    var contents = Restangular.all('contents');

    contents.getList().then(function (contents) {
        $scope.contents = contents;
        //$scope.gridOptions.data = contents;
    });
    // ui-grid
    //$scope.gridOptions = {
    //    enableSorting: true,
    //    columnDefs: [
    //        { field: 'id' },
    //        { field: 'typeName' },
    //        { field: 'isActive', enableSorting: false }
    //    ]
    //};
}

ContentCtrl.$inject = ['$scope', '$rootScope', 'Restangular'];
module.exports = ContentCtrl;
