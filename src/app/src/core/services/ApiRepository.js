'use strict';

function ApiRepository(Restangular) {
    return {
        login: function() {
            return Restangular.one('/login').post();
        },
        logout: function() {
            return Restangular.one('/logout').post();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        }
    };
}

ApiRepository.$inject = ['Restangular'];
module.exports = ApiRepository;
