'use strict';

function ContentDetailsCtrl($scope, $stateParams, langCode, ContentRepository, Notifications) {
    // get single content
    ContentRepository.one($stateParams.contentId).then(function(response) {
        $scope.content = ContentRepository.clean(response);
    });

    //console.log($stateParams.langCode);
    //$scope.xxx = 'xxx';
    $scope.langCode = langCode;
    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Notifications.addSuccess('SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', '$stateParams', 'langCode', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsCtrl;
