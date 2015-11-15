'use strict';

function StatesDropdown($dropdown) {
    return {
        scope: {statesDropdown: '='},
        restrict: 'A',
        link: function(scope, element, attrs) {
            var dropdown = $dropdown(element, {
                templateUrl: 'gzero/admin/views/core/directives/statesDropdown.tpl.html',
                animation: 'am-flip-x',
                placement: 'bottom-right'
            });

            element.on('click', function() {
                dropdown.$scope.content = scope.statesDropdown;
            });
        }
    };
}

StatesDropdown.$inject = [];
module.exports = StatesDropdown;
