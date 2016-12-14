<?php namespace Gzero\Admin;

use Gzero\Admin\Middleware\AdminPanelAccess;
use Illuminate\Routing\Router;
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
     * Indicates if loading of the provider is deferred.
     *
     * @var bool
     */
    protected $defer = false;

    /**
     * The application's route middleware.
     *
     * @var array
     */
    protected $routeMiddleware = [
        'admin.panel.access' => AdminPanelAccess::class,
    ];

    /**
     * Bootstrap the application events.
     *
     * @param Router $router Laravel router
     *
     * @return void
     */
    public function boot(Router $router)
    {
        $this->loadRoutesFrom(__DIR__ . '/../../../routes/web.php');
        $this->loadViewsFrom(__DIR__ . '/../../views', 'gzero-admin');
        $this->registerRouteMiddleware($router);
        $this->publishes(
            [
                __DIR__ . '/../../views' => base_path('resources/views/gzero/admin')
            ],
            'views'
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

    /**
     * Register additional route middleware
     *
     * @param Router $router Laravel router
     *
     * @return void
     */
    private function registerRouteMiddleware(Router $router)
    {
        foreach ($this->routeMiddleware as $name => $class) {
            $router->middleware($name, $class);
        }
    }
} 
