<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */
group(
    ['domain' => config('gzero.domain'), 'prefix' => 'admin', 'middleware' => 'access'],
    function () {
        get(
            '/',
            function () {
                \Debugbar::disable();
                return view('gzero-admin::admin', ['modules' => app()->make('admin.module')]);
            }
        );

        get(
            'logout',
            function () {
                Auth::logout();
                return redirect(route('home'));
            }
        );
    }
);

