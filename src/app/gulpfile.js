// Get modules
var gulp = require('gulp');
var sass = require('gulp-sass');
var gutil = require('gulp-util');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var notify = require('gulp-notify');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
var rename = require("gulp-rename");
var plumber = require('gulp-plumber');
var imagemin = require('gulp-imagemin');
var browserify = require('browserify');
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
gulp.task('styles', function() {
  return gulp.src('sass/application.css.scss')
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sass({outputStyle: 'compressed'}))
    .pipe(autoprefixer(AUTOPREFIXER_BROWSERS))
    .pipe(rename('application.css'))
    .pipe(gulp.dest(publicPath + 'css'));
});

// Task scripts
gulp.task('scripts', function() {
  // set up the browserify instance on a task basis
  var b = browserify({
    entries: './src/app.js',
    insertGlobals: true,
    debug: true
  });

  return b.bundle()
    .on('error', notify.onError({
      message: "<%= error.message %>",
      title: "Error running scripts"
    }))
    .pipe(source('admin.js'))
    .pipe(buffer())
    .pipe(gulp.dest(publicPath + 'js'))
    .pipe(sourcemaps.init({loadMaps: true}))
    // Add transformation tasks to the pipeline here.
    .pipe(uglify())
    .on('error', gutil.log)
    .pipe(rename('admin.min.js'))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest(publicPath + 'js'));
});

// Task compress-vendor
gulp.task('compress-vendor', function() {
  gulp.src([
    'vendor/lodash.js',
    'vendor/async.js',
    'vendor/angular/angular.js',
    'vendor/angular/angular-ui-router.js',
    'vendor/angular/angular-translate.js',
    'vendor/angular/angular-translate-loader-partial.js',
    'vendor/angular/restangular.js',
    'vendor/angular/angular-animate.js',
    'vendor/angular/angular-strap.js',
    'vendor/angular/angular-strap.tpl.js',
    'vendor/angular/ng-table.js',
    'vendor/angular/angular-ui-tree.js',
    'vendor/angular/ct-ui-router-extras.js',
    'vendor/angular/angular-ui-router-default.js',
    'vendor/ie10-viewport-bug-workaround.js',
    'vendor/jquery.js',
    'vendor/pnotify.custom.js'
  ])
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(concat(publicPath + 'js/vendor.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(publicPath + 'js'));

  gulp.src([
    'vendor/lodash.min.js',
    'vendor/async.min.js',
    'vendor/angular/angular.min.js',
    'vendor/angular/angular-ui-router.min.js',
    'vendor/angular/angular-translate.min.js',
    'vendor/angular/angular-translate-loader-partial.min.js',
    'vendor/angular/restangular.min.js',
    'vendor/angular/angular-animate.min.js',
    'vendor/angular/angular-strap.min.js',
    'vendor/angular/angular-strap.tpl.min.js',
    'vendor/angular/ng-table.min.js',
    'vendor/angular/angular-ui-tree.min.js',
    'vendor/angular/ct-ui-router-extras.min.js',
    'vendor/angular/angular-ui-router-default.min.js',
    'vendor/ie10-viewport-bug-workaround.min.js',
    'vendor/jquery.min.js',
    'vendor/pnotify.custom.min.js'
  ])
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(concat(publicPath + 'js/vendor.js'))
    .pipe(rename('vendor.min.js'))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(publicPath + 'js'));
});

// Task images
gulp.task('images', function() {
  return gulp.src('img/**/*.{png,gif,jpg}')
    .pipe(plumber({errorHandler: notify.onError("Error: <%= error.message %>")}))
    .pipe(imagemin())
    .pipe(gulp.dest(publicPath + 'img/'));
});

// Task watch
gulp.task('watch', function() {
  gulp.watch('sass/**/*.scss', ['styles']);
  gulp.watch('src/**/*.js', ['scripts']);
  gulp.watch('img/**/*', ['images']);
});

// The default task (called when you run `gulp` from cli)
gulp.task('default', ['watch']);
