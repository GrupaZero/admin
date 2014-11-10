'use strict';

function LangRepository(Restangular) {
    var api = Restangular.all('langs');
    return {
        all: function() {
            return api.getList();
        }
    };
}

LangRepository.$inject = ['Restangular'];
module.exports = LangRepository;
