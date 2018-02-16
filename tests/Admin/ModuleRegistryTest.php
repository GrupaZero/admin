<?php namespace tests\Admin;

use Gzero\Admin\ModuleRegistry;
use PHPUnit\Framework\TestCase;

class Test extends TestCase {

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
