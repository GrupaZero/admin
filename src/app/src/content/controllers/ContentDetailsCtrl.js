'use strict';

function ContentDetailsCtrl($scope, content, langCode, ContentRepository, Notifications) {
    $scope.content = ContentRepository.clean(content);
    $scope.langCode = langCode;
    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Notifications.addSuccess('SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', 'content', 'langCode', 'ContentRepository', 'Notifications'];
module.exports = ContentDetailsCtrl;
