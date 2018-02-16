<?php

/**
 * Return admin view so we can run AngularJS admin panel
 */

use Gzero\Admin\Middleware\AdminPanelAccess;

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
                    AdminPanelAccess::class
                ],
                function () {
                    if (isProviderLoaded('Barryvdh\Debugbar\ServiceProvider')) {
                        resolve('debugbar')->disable();
                    }
                    // @TODO get this settings and types from api
                    $settings = [
                        'allowed_file_extensions'  => [
                            'image'    => ['png', 'jpg', 'jpeg', 'tif'],
                            'document' => ['pdf', 'odt', 'ods', 'doc', 'docx', 'xls', 'xlsx', 'txt'],
                            'video'    => ['mp4'],
                            'music'    => ['mp3']
                        ],
                        'content_types'            => ['content', 'category'],
                        'block_types'              => ['basic', 'menu', 'slider'],
                        'file_types'               => ['image', 'document', 'video', 'music'],
                        'blocks_regions' => [
                            'header',
                            'homepage',
                            'featured',
                            'contentHeader',
                            'sidebarLeft',
                            'sidebarRight',
                            'contentFooter',
                            'footer'
                        ]
                    ];
                    return view('gzero-admin::admin', ['modules' => app()->make('admin.module'), 'settings' => $settings]);
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

