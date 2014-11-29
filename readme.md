GZERO ADMIN [![Build Status](https://travis-ci.org/GrupaZero/admin.svg?branch=master)](https://travis-ci.org/GrupaZero/admin)
===

**The project is still in the phase of intensive development**

This documentation assumed that you have already installed and fully configured [Platform](https://github.com/GrupaZero/platform).

# Table of contents
* [The beginning](#the-beginning)
* [Symbolic links](#symbolic-links)
* [Installing Node.js](#installing-nodejs)
* [Installing Node packages](#installing-node-packages)
* [How to develop?](#how-to-develop)
* [JavaScript tests](#javascript-tests)

## The beginning
First of all clone Admin package repository into your directory. For your convenience, Platform and Admin repositories should be stored in the same root directory, in exmaple 'gzero'.

## Symbolic links
Admin package is required dependency for Platform in composer. Symbolic links are required to provide the latest changes of Admin package in Platform.

In your root directory type the following commands:
```
$ cd platform/vendor/gzero
```
Remove admin package installed from composer:
```
$ rm -r admin
```
Create symbolic link to fresh version of admin package
```
$ ln -s ../../../admin
```
Go to public directory in platform:
```
$ cd ../../public/packages/gzero
```
Remove admin package assets published after installation from composer:
```
$ rm -r admin
```
Create symbolic link to fresh public assets of admin package
```
$ ln -s ../../../../admin/public/ admin
```
From now on all changes in Admin package will be available in Platform.

## Installing Node.js
* <a href="http://nodejs.org/download" target="_blank" title="Download Node.js">Download Node.js</a>
* <a href="https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager" target="_blank" title="Installing from package managers">Installing from package managers</a>

## Installing Node packages
To install all required Node packages just type into Admin package root directory:
```
$ npm install
```

## How to develop?
For proper communication with the API is required to modify the hosts file in your OS.
In Ubuntu hosts file should looks like the following:
```
# /etc/hosts
127.0.0.1	localhost
...
127.0.0.1	gzero.dev
127.0.0.1	api.gzero.dev
...
```

There are 2 required things, that should be done, every time before you start to develop Admin package:

1. In Platform root directory start PHP build in server: `$ php artisan serve`.
2. In `admin/src/app` directory run gulp.js: `$ gulp`.

After these steps try to log in to the admin panel:
```
URL: http://gzero.dev:8000/en/login
login: a@a.pl
pass: test
```

If admin panel appeared, everything works fine.

Now release your imagination and create your own magic ;-)

## JavaScript tests
In `admin/src/app` directory run karma server:
```
$ ../../node_modules/karma/bin/karma start
```
From now on you can write tests in `admin/src/app/tests`
