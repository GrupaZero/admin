<?php
Route::get('admin', function(){
        \Debugbar::disable();
        return View::make('gzero-admin::admin');
    });
