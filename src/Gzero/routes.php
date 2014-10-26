<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */
Route::get(
    'admin',
    function () {
        \Debugbar::disable();
        return View::make('gzero-admin::admin', ['modules' => \App::make('admin.module')]);
    }
);
