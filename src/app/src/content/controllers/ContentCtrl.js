'use strict';

function ContentCtrl($scope, $rootScope, Restangular, $aside) {
    console.log('ContentCtrl loaded');
    var contents = Restangular.all('contents');
    var viewPath = 'packages/gzero/admin/views/content/';

    contents.getList().then(function (contents) {
        $scope.contents = contents;
        //$scope.gridOptions.data = contents;
    });


    //// Pre-fetch an external template populated with a custom scope
    var myOtherAside = $aside({
        title: 'My Title',
        content: 'My Content',
        scope: $scope,
        template: viewPath + 'categories.html'
    });
    // Show when some event occurs (use $promise property to ensure the template has been loaded)
    myOtherAside.$promise.then(function () {
        myOtherAside.show();
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

ContentCtrl.$inject = ['$scope', '$rootScope', 'Restangular', '$aside'];
module.exports = ContentCtrl;
