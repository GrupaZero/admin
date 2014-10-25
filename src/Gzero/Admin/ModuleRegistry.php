<?php namespace Gzero\Admin;

use Illuminate\Support\Collection;

/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class ModuleRegistry
 *
 * @package    Gzero\Admin
 * @author     Adrian Skierniewski <adrian.skierniewski@gmail.com>
 * @copyright  Copyright (c) 2014, Adrian Skierniewski
 */
class ModuleRegistry {

    /**
     * @var Collection
     */
    protected $modules;

    public function __construct()
    {
        $this->modules = new Collection();
    }

    /**
     * @param $name
     * @param $path
     */
    public function register($name, $path)
    {
        $this->modules->push(compact('name', 'path'));
    }

    /**
     * @return Collection
     */
    public function getModules()
    {
        return $this->modules;
    }

} 
