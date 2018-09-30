'use strict';

function EntityFilesCtrl($scope, $timeout, $stateParams, Utils, entity, langCode, FilesRepository) { //jshint ignore:line
    var type = $stateParams.type;
    var params = {
      'perPage': 1000 // hax to not paginate the results since we want to sort them by weight
    };

    $scope.files = [];
    $scope.blockers = {
        isDirty: false,
        apiProcessing: false,
        initializing: true
    };

    if (_.indexOf(Utils.Config.fileTypes, type) === -1) {
        var path = Utils.$state.current.name.replace('files', 'details');

        Utils.$state.go(path, {entityId: entity.id, langCode: langCode}, {reload: true});
    }

    FilesRepository.listForEntity(entity, params)
    .then(function(response) {
        $scope.files = _.groupBy(FilesRepository.clean(response), 'type');
        $scope.type = type;

        if (_.isUndefined($scope.files[type])) {
            $scope.files[type] = [];
        }

        $timeout(function() {
            $scope.blockers.initializing = false;
        }, 100);
    });

    $scope.syncFiles = function() {
        $scope.blockers.apiProcessing = true;

        FilesRepository.syncWithEntity(entity, _.flatMap($scope.files))
        .then(function(response) {
            $scope.blockers.apiProcessing = false;
            Utils.Notifications.addSuccess('THE_CHANGES_HAVE_BEEN_SAVED');
            $scope.blockers.isDirty = false;
        });
    };

    $scope.detachFile = function(fileId) {
        // only when files has been selected
        if (typeof fileId !== 'undefined') {
            $scope.files[type] = _.reject($scope.files[type], {id: fileId});
        }
    };

    $scope.$watchCollection('files[type]', function(newValue, oldValue) {
            if (!$scope.blockers.initializing) {
                _.each(newValue, function(file, index) {
                    file.weight = index;
                });

                $scope.blockers.isDirty = true;
            }
        }
    );

    $scope.$on('$destroy', function() {
        if ($scope.blockers.isDirty && !$scope.blockers.initializing && !$scope.blockers.apiProcessing) {
            $timeout($scope.syncFiles, 150);
        }
    });
}

EntityFilesCtrl.$inject = ['$scope', '$timeout', '$stateParams', 'Utils', 'entity', 'langCode', 'FilesRepository'];
module.exports = EntityFilesCtrl;
