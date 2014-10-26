<?php
/**
 * This file is part of the GZERO CMS package.
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 *
 * Class Test
 *
 * @package    tests\Admin
 * @author     Adrian Skierniewski <adrian.skierniewski@gmail.com>
 * @copyright  Copyright (c) 2014, Adrian Skierniewski
 */

namespace tests\Admin;

use Gzero\Admin\ModuleRegistry;

class Test extends \PHPUnit_Framework_TestCase {

    /**
     * @test
     * @expectedException \Exception
     */
    function it_cant_add_wrong_path()
    {
        $registry = new ModuleRegistry();
        $registry->register('module.name', 'wrong/path');
    }

    /**
     * @test
     */
    function it_can_register()
    {
        $registry = new ModuleRegistry();
        $registry->register('module.name', 'good/path.js');
        $this->assertEquals($registry->getModules()->toArray(), [['name' => 'module.name', 'path' => 'good/path.js']]);
    }
}
