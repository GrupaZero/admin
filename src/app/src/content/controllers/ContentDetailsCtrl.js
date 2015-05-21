'use strict';

function ContentDetailsCtrl($scope, $stateParams, ContentRepository, Notifications) {
    // get single content
    ContentRepository.one($stateParams.contentId).then(function(response) {
        $scope.content = ContentRepository.clean(response);
    });

    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Notifications.addSuccess('SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', '$stateParams', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsCtrl;
