'use strict';

function BlocksEditCtrl($scope, Utils, langCode, block, BlocksRepository, BlockService) {
    $scope.ckOptions = Utils.ckOptions;
    $scope.isEdited = true;
    // if block types are set
    if (typeof block !== 'undefined') {
        $scope.newBlock = BlocksRepository.clean(block);
        // set active translation
        if (typeof $scope.newBlock.translations !== 'undefined') {
            $scope.newBlock.translations = _.find($scope.newBlock.translations, {'language_code': langCode});
            // if not found, set as new
            if (typeof $scope.newBlock.translations === 'undefined') {
                $scope.newBlock.translations = {'language_code': langCode};
            }
        }
    }

    // check for translations update @TODO use translations history
    $scope.$watchCollection('newBlock.translations', function(newValue, oldValue) {
        if (newValue !== oldValue) {
            $scope.isTranslationChanged = true;
        }
    });

    // block PUT action
    $scope.save = function(newBlock) {
        newBlock = BlockService.prepareRequestData(newBlock);
        // update block
        BlocksRepository.update(Utils.$stateParams.blockId, newBlock).then(function(response) {
            // add new translation @TODO use translations history
            if ($scope.isTranslationChanged) {
                BlocksRepository.createTranslation(Utils.$stateParams.blockId, newBlock.translations).then(function(response) {
                    Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                    Utils.redirectBack('blocks.list');
                }, function(response) {
                    Utils.Notifications.addError(response.data.message);
                });
            } else {
                Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
                Utils.redirectBack('blocks.list');
            }

        }, function(response) {
            Utils.Notifications.addError(response.data.message);
        });
    };
}

BlocksEditCtrl.$inject = ['$scope', 'Utils', 'langCode', 'block', 'BlocksRepository', 'BlockService'];
module.exports = BlocksEditCtrl;
