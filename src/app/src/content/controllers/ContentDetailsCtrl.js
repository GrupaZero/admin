'use strict';

function ContentDetailsCtrl($scope, content, langCode, ContentRepository, Notifications) {
    $scope.tabs = [
        {
            title: 'CONTENT',
            action: 'details'
        },
        {
            title: 'HISTORY_OF_CHANGES',
            action: 'history'
        }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    // if content exists
    if (typeof content !== 'undefined') {
        $scope.content = ContentRepository.clean(content);
    }

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
