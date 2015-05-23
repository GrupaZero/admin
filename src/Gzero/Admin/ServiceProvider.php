<?php namespace Gzero\Admin;

use Illuminate\Support\ServiceProvider as SP;

/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ServiceProvider
 *
 * @author     Adrian Skierniewski <adrian.skierniewski@gmail.com>
 * @copyright  Copyright (c) 2014, Adrian Skierniewski
 */
class ServiceProvider extends SP {

    /**
     * Bootstrap the application events.
     *
     * @return void
     */
    public function boot()
    {
        $this->registerRoutes();
        $this->loadViewsFrom(__DIR__ . '/../../views', 'gzero-admin');
        $this->publishes(
            [
                __DIR__ . '/../../views',
                'gzero-admin' => base_path('resources/views/gzero/admin'),
            ]
        );
        $this->publishes(
            [
                __DIR__ . '/../../../public' => public_path('gzero/admin'),
            ],
            'public'
        );
    }

    /**
     * Register the service provider.
     *
     * @return void
     */
    public function register()
    {
        $this->app->singleton(
            'admin.module',
            function ($app) {
                return new ModuleRegistry();
            }
        );
    }

    private function registerRoutes()
    {
        require_once __DIR__ . '/../routes.php';
    }
} 
