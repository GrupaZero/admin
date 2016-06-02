/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class FileController
 *
 * @package    Admin
 */

'use strict';

function FilesRepository(Restangular, Upload) {
    var api = 'admin/files';
    var users = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return users.getList(params);
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        delete: function(id) {
            return Restangular.one(api, id).remove();
        },
        update: function(id, user) {
            return Restangular.one(api, id).customPUT(user);
        },
        create: function(newFile) {
            return Upload.upload({
                url: Restangular.configuration.baseUrl + '/' + api,
                headers : Restangular.configuration.defaultHeaders,
                withCredentials: Restangular.configuration.defaultHttpFields.withCredentials,
                data: newFile
            });
        },
        newTranslation: function(id, newTranslation) {
            return Restangular.one(api, id).all('translations').post(newTranslation);
        },
        deleteTranslation: function(fileId, translationId) {
            return Restangular.one(api, fileId).one('translations', translationId).remove();
        }
    };
}

FilesRepository.$inject = ['Restangular', 'Upload'];
module.exports = FilesRepository;
