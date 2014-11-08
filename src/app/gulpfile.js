// Get modules
var gulp = require('gulp');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require("gulp-rename");
var imagemin = require('gulp-imagemin');
var browserify = require('gulp-browserify');
var sourcemaps = require('gulp-sourcemaps');
var autoprefixer = require('gulp-autoprefixer');

var AUTOPREFIXER_BROWSERS = [
    'ie >= 10',
    'ie_mob >= 10',
    'ff >= 30',
    'chrome >= 34',
    'safari >= 7',
    'opera >= 23',
    'ios >= 7',
    'android >= 4.4',
    'bb >= 10'
];

var publicPath = '../../public/';
// Task sass
gulp.task('styles', function () {
    return gulp.src('sass/base.scss')
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest(publicPath + 'css'));
});

// Task scripts
gulp.task('scripts', function () {
    return gulp.src('src/app.js')
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(rename('admin.js'))
        .pipe(gulp.dest(publicPath + 'js'));
});

// Task compress
gulp.task('compress', ['scripts'], function () {
    return gulp.src(publicPath + 'js/admin.js')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(rename('admin.min.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(publicPath + 'js'));
});

// Task compress-vendor
gulp.task('compress-vendor', function () {
    gulp.src([
        'vendor/lodash.js',
        'vendor/angular/angular.js',
        'vendor/angular/angular-ui-router.js',
        'vendor/angular/angular-translate.js',
        'vendor/angular/angular-translate-loader-partial.js',
        'vendor/angular/restangular.js',
        'vendor/angular/angular-animate.js',
        'vendor/angular/angular-touch.js',
        'vendor/angular/angular-strap.js',
        'vendor/angular/angular-strap.tpl.js',
        'vendor/ie10-viewport-bug-workaround.js'
    ])
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat(publicPath + 'js/vendor.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(publicPath + 'js'));

    gulp.src([
        'vendor/lodash.min.js',
        'vendor/angular/angular.min.js',
        'vendor/angular/angular-ui-router.min.js',
        'vendor/angular/angular-translate.min.js',
        'vendor/angular/angular-translate-loader-partial.min.js',
        'vendor/angular/restangular.min.js',
        'vendor/angular/angular-animate.min.js',
        'vendor/angular/angular-strap.min.js',
        'vendor/angular/angular-touch.min.js',
        'vendor/angular/angular-strap.tpl.min.js',
        'vendor/ie10-viewport-bug-workaround.min.js'
    ])
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(concat(publicPath + 'js/vendor.js'))
        .pipe(rename('vendor.min.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(publicPath + 'js'));
});

// Task images
gulp.task('images', function () {
    return gulp.src('img/**/*.{png,gif,jpg,gif}')
        .pipe(imagemin())
        .pipe(gulp.dest(publicPath + 'img/'));
});

// Task watch
gulp.task('watch', function () {
    gulp.watch('sass/**/*.scss', ['styles']);
    gulp.watch('src/**/*.js', ['compress']);
    //gulp.watch('src/app.js', ['compress']);
    gulp.watch('img/**/*', ['images']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch']);
