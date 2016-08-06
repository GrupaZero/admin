GZERO ADMIN [![Build Status](https://travis-ci.org/GrupaZero/admin.svg?branch=master)](https://travis-ci.org/GrupaZero/admin)
===

**The project is still in the phase of intensive development.**

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

## Mounting admin package in platform
Admin package is required dependency for Platform in composer. Mounting admin packege is required to provide the latest changes of Admin package in Platform.

In platform root directory type the following command:
```
$ ./scripts/link_package.sh admin mount
```
From now on all changes in Admin package will be available in Platform.

To unmount Admin package type the following command in platform root directory:
```
$ ./scripts/link_package.sh admin umount
```
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
127.0.0.1	dev.gzero.pl
127.0.0.1   api.dev.gzero.pl
...
```

There are 3 required things, that should be done, every time before you start to develop Admin package:

1. In Platform root directory
 - use `./scripts/link_package.sh admin mount` to mount your version of admin package.
 - start Docker container for platform: `$ sudo docker-compose up -d`.
2. In Admin package run `npm start` to start gulp watch. Now each time when you save file gulp will rebuild app.

After these steps try to log in to the admin panel:
```
URL: http://dev.gzero.pl:8000/en/login
login: admin@gzero.pl
pass: test
```

If admin panel appeared, everything works fine.

Now release your imagination and create your own magic ;-)

## JavaScript tests
To run karma server:
```
$ npm test
```
From now on you can write tests in `admin/src/app/tests`.
