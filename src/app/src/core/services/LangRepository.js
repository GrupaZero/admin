'use strict';

function LangRepository(Restangular) {
    var api = Restangular.all('languages');

    return {
        one: function(code) {
            return api.get(code);
        },
        list: function() {
            return api.getList();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;
