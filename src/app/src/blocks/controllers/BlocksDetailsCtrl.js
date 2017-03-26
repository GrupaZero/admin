'use strict';

function BlocksDetailsCtrl($scope, block, langCode, BlocksRepository, Utils) {

    $scope.Config = Utils.Config;

    // TODO: get registered tabs
    $scope.tabs = [
        {
            title: 'CONTENT',
            action: 'details',
            default: true // default active tab in settings edit mode
        },
        {
            title: 'FILE_TYPES.IMAGE',
            action: 'files',
            params: { blockId: block.id, langCode: langCode, type: 'image' }
        },
        {
            title: 'FILE_TYPES.DOCUMENT',
            action: 'files',
            params: { blockId: block.id, langCode: langCode, type: 'document' }
        }
    ];

    // if lang code exists
    if (typeof langCode !== 'undefined') {
        $scope.langCode = langCode;
    }

    // if block exists
    if (typeof block !== 'undefined') {
        $scope.block = BlocksRepository.clean(block);
    }

}
BlocksDetailsCtrl.$inject = ['$scope', 'block', 'langCode', 'BlocksRepository', 'Utils'];
module.exports = BlocksDetailsCtrl;
