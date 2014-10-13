<?php
Route::get('admin', function(){
        \Debugbar::disable();
        return 'You have arrived!';
    });
