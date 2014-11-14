<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */
Route::group(
    ['domain' => Config::get('gzero.domain'), 'before' => 'auth'],
    function () {
        Route::get(
            'admin',
            function () {
                \Debugbar::disable();
                return View::make('gzero-admin::admin', ['modules' => \App::make('admin.module')]);
            }
        );
    }
);

