'use strict';

function ckOptions() {

    return function(custom) {

        var defaults = {
            toolbarGroups: [
                {name: 'insert', groups: ['insert']},
                {name: 'tools'},
                {name: 'links'},
                {name: 'basicstyles', groups: ['basicstyles', 'cleanup']},
                {name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi']},
                {name: 'styles'},
                {name: 'others'}
            ],
            extraPlugins: 'markdown',
            height: '350px'
        };

        angular.forEach(custom, function(v, k) {
            defaults[k] = v;
        });

        return defaults;

    };

}

module.$inject = [];
module.exports = ckOptions;
