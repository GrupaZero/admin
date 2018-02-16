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

function FilesRepository(Restangular, Upload, Utils) {
    var api = 'files';
    var files = Restangular.all(api);
    return {
        one: function(id, params) {
            return Restangular.one(api, id).get(params);
        },
        list: function(params) {
            return files.getList(params);
        },
        listForEntity: function(entity, params) {
            return Restangular.one(this.getEntityEndpoint(entity), entity.id)
            .all('files')
            .getList(params);
        },
        syncWithEntity: function(entity, files) {
            return Restangular.one(this.getEntityEndpoint(entity), entity.id)
            .customPUT({data: files}, 'files');
        },
        delete: function(id) {
            return Restangular.one(api, id)
            .remove();
        },
        update: function(id, file) {
            return Restangular.one(api, id).patch(file);
        },
        create: function(newFile) {
            return Upload.upload({
                url: _.clone(Restangular.configuration.baseUrl) + '/' + api,
                headers: _.clone(Restangular.configuration.defaultHeaders),
                withCredentials: _.clone(Restangular.configuration.defaultHttpFields.withCredentials),
                data: newFile
            });
        },
        newTranslation: function(id, newTranslation) {
            return Restangular.one(api, id)
            .all('translations')
            .post(newTranslation);
        },
        deleteTranslation: function(fileId, translationId) {
            return Restangular.one(api, fileId)
            .one('translations', translationId)
            .remove();
        },
        clean: function(elem) {
            return Restangular.stripRestangular(elem);
        },
        getEntityEndpoint: function(entity) {
            if (_.indexOf(Utils.Config.contentTypes, entity.type) !== -1) {
                return 'contents';
            }

            if (_.indexOf(Utils.Config.blockTypes, entity.type) !== -1) {
                return 'blocks';
            }

            return api;
        }
    };
}

FilesRepository.$inject = ['Restangular', 'Upload', 'Utils'];
module.exports = FilesRepository;
