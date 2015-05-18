<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */
Route::group(
    ['domain' => Config::get('gzero.domain'), 'prefix' => 'admin', 'before' => 'auth'],
    function () {
        Route::get(
            '/',
            function () {
                \Debugbar::disable();
                return View::make('gzero-admin::admin', ['modules' => \App::make('admin.module')]);
            }
        );

        Route::get(
            'logout',
            function () {
                Auth::logout();
                return Redirect::route('home');
            }
        );
    }
);

