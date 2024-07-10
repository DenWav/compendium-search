const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const { rimraf } = require('rimraf')

gulp.task('copy', () => {
  return Promise.all([
    gulp.src('readme.md').pipe(gulp.dest('dist/')),
    gulp.src('license.txt').pipe(gulp.dest('dist/')),
    gulp.src('public/**').pipe(gulp.dest('dist/')),
    // Also include source typescript files
    gulp.src('src/**/*.ts').pipe(gulp.dest('dist/scripts/')),
  ]);
});

const project = ts.createProject('tsconfig.json');
gulp.task('compile', () => {
  return gulp.src('src/*.ts')
    .pipe(sourcemaps.init())
    .pipe(project())
    .pipe(sourcemaps.write('.', { sourceRoot: './', includeContent: false }))
    .pipe(gulp.dest('dist/scripts/'));
});

gulp.task('clean', () => {
  return rimraf('dist')
});

gulp.task('build', gulp.series('clean', gulp.parallel('compile', 'copy')));

const foundryData = process.env.FOUNDRY_DATA
const MODULEPATH = `${foundryData}/Data/modules/compendium-search`
gulp.task('foundry', () => {
  return gulp.src('dist/**').pipe(gulp.dest(MODULEPATH))
});

gulp.task("update", gulp.series('build', 'foundry'));
