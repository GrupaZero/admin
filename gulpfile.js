// Get modules
var gulp = require('gulp');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var rename = require("gulp-rename");
var imagemin = require('gulp-imagemin');
var browserify = require('gulp-browserify');
var sourcemaps = require('gulp-sourcemaps');
var livereload = require('gulp-livereload');
var shim = require('browserify-shim');
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

var assetsPath = 'public/';
// Task sass
gulp.task('styles', function () {
    gulp.src(assetsPath + 'sass/base.scss')
        .pipe(sass({outputStyle: 'compressed'}))
        .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
        .pipe(gulp.dest(assetsPath + 'css'))
        .pipe(livereload());
});

// Task scripts
gulp.task('scripts', function () {
    gulp.src(assetsPath + 'js/src/app.js')
        .pipe(browserify({
            insertGlobals: true,
            debug: true
        }))
        .pipe(rename('all.js'))
        .pipe(gulp.dest(assetsPath + 'js'))
        .pipe(livereload());
});

gulp.task('compress', function () {
    gulp.src(assetsPath + 'js/all.js')
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(uglify())
        .pipe(rename('all.min.js'))
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(assetsPath + 'js'));
});

// Task images
gulp.task('images', function () {
    //common
    gulp.src(assetsPath + 'images-orig/*.{png,gif,jpg}')
        .pipe(imagemin())
        .pipe(gulp.dest(assetsPath + 'images/'));
});

// Task watch
gulp.task('watch', function () {

    var server = livereload();

    gulp.watch(assetsPath + 'sass/**/*.scss', ['styles']);
    gulp.watch(assetsPath + 'js/src/**.js', ['scripts']);
    gulp.watch(assetsPath + 'js/all.js', ['compress']);
    gulp.watch(assetsPath + 'images-orig/**', ['images']);
    //gulp.watch('app/views/**/*.twig').on('change', function (file) {
    //    server.changed(file.path);
    //});

});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['styles', 'scripts', 'images', 'watch']);
