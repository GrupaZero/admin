'use strict';

function LangRepository(Restangular) {
    /**
     * Custom methods
     */
    Restangular.extendModel('langs', function(model) {
        model.test = function() {
            return 'test';
        };
        return model;
    });

    var api = Restangular.all('langs');
    return {
        one: function(code) {
            return api.get(code);
        },
        all: function() {
            return api.getList();
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;
