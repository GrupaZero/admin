'use strict';

function ContentDetailsCtrl($scope, content, langCode, author, ContentRepository, Utils) {

    $scope.Config = Utils.Config;

    // TODO: get registered tabs
    $scope.tabs = [
        {
            title: 'CONTENT',
            action: 'details',
            default: true // default active tab in settings edit mode
        },
        {
            title: 'HISTORY_OF_CHANGES',
            action: 'history'
        },
        {
            title: 'FILE_TYPES.IMAGE',
            action: 'files',
            params: { contentId: content.id, langCode: langCode, type: 'image' }
        },
        {
            title: 'FILE_TYPES.DOCUMENT',
            action: 'files',
            params: { contentId: content.id, langCode: langCode, type: 'document' }
        },
        {
            title: 'BLOCKS',
            action: 'blocks'
        }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    if (typeof author !== 'undefined') {
        $scope.author = author;
    }

    // if content exists
    if (typeof content !== 'undefined') {
        $scope.content = ContentRepository.clean(content);

        // if content parent exists
        if (content.path.length > 1) {
            // the last but one id number from path
            var parentId = _.takeRight(content.path, 2)[0];
            ContentRepository.one(parentId).then(function(response) {
                $scope.contentParent = ContentRepository.clean(response);
            });
        }
    }

    $scope.saveContent = function() {
        ContentRepository
            .updateContent($scope.content.id, $scope.content)
            .then(function() {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
            });
    };

}
ContentDetailsCtrl.$inject = ['$scope', 'content', 'langCode','author', 'ContentRepository', 'Utils'];
module.exports = ContentDetailsCtrl;
