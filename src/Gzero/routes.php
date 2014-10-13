<?php
Route::get('{lang}/admin', function(){
        \Debugbar::disable();
        return 'You have arrived!';
    });
