'use strict';

function BlocksAddCtrl($scope, Utils, BlocksRepository) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isEdited = false;
    // default values
    $scope.newBlock = {
        isActive: true,
        weight: 0,
        translations: {
            langCode: $scope.currentLang.code
        }
    };

    // if block types are set
    if (typeof $scope.blockTypes !== 'undefined') {
        $scope.newBlock.type = $scope.blockTypes[0];
    }

    // if block regions are set
    if (typeof $scope.blockRegions !== 'undefined') {
        $scope.newBlock.region = $scope.blockRegions[0];
    }

    // block POST action
    $scope.save = function(newBlock) {
        BlocksRepository.create(newBlock).then(function(response) {
            Utils.Notifications.addSuccess('BLOCK_CREATED');
            Utils.$state.go('blocks.list', {}, {reload: true});
        }, function(response) {
            Utils.Notifications.addErrors(response.data.messages);
        });
    };
}

BlocksAddCtrl.$inject = ['$scope', 'Utils', 'BlocksRepository'];
module.exports = BlocksAddCtrl;
