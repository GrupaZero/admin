'use strict';

function ContentDetailsCtrl($scope, $stateParams, ContentRepository) {
    // get single content
    ContentRepository.one($stateParams.contentId).then(function(response) {
        $scope.content = ContentRepository.clean(response);
    });

    $scope.saveContent = function(){
        ContentRepository
    };

}
ContentDetailsCtrl.$inject = ['$scope', '$stateParams', 'ContentRepository'];
module.exports = ContentDetailsCtrl;
