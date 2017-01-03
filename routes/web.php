<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */
Route::group(
    [
        'domain'     => config('gzero.domain'),
        'prefix'     => 'admin',
        'middleware' => ['web']
    ],
    function ($router) {
        /** @var \Illuminate\Routing\Router $router */

        $router->get(
            '/',
            [
                'as'         => 'admin',
                'middleware' => [
                    'admin.panel.access'
                ],
                function () {
                    if (isProviderLoaded('Barryvdh\Debugbar\ServiceProvider')) {
                        resolve('debugbar')->disable();
                    }
                    return view('gzero-admin::admin', ['modules' => app()->make('admin.module')]);
                }
            ]
        );

        $router->get(
            'logout',
            [
                'as' => 'admin.logout',
                function (\Illuminate\Http\Request $request) {

                    auth()->guard()->logout();

                    $request->session()->flush();

                    $request->session()->regenerate();

                    return redirect()->route('home');
                }
            ]

        );
    }
);

