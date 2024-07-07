const gulp = require('gulp');
const sourcemaps = require('gulp-sourcemaps');
const ts = require('gulp-typescript');
const del = require('del');
const merge = require('merge-stream');

const project = ts.createProject('tsconfig.json');
gulp.task('compile', () => {
  return gulp.src('src/scripts/*.ts')
    .pipe(sourcemaps.init())
    .pipe(project())
    .pipe(sourcemaps.write('.', { sourceRoot: './', includeContent: false }))
    .pipe(gulp.dest('dist/scripts/'));
});

gulp.task('copy', (done) => {
  gulp.src('readme.md').pipe(gulp.dest('dist/'));
  gulp.src('license.txt').pipe(gulp.dest('dist/'));
  gulp.src('src/module.json').pipe(gulp.dest('dist/'));
  gulp.src('src/lang/**').pipe(gulp.dest('dist/lang/'));
  gulp.src('src/template/**').pipe(gulp.dest('dist/template/'));
  gulp.src('src/styles/**').pipe(gulp.dest('dist/styles/'));
  // Also include source typescript files
  gulp.src('src/scripts/**/*.ts').pipe(gulp.dest('dist/scripts/'));
  done();
});

gulp.task('build', gulp.parallel('compile', 'copy'));

const foundryData = process.env.FOUNDRY_DATA

gulp.task('clean', (done) => {
  del.sync(['dist', 'foundryData/Data/modules/compendium-search']);
  done()
})

const MODULEPATH = `${foundryData}/Data/modules/compendium-search`
gulp.task('foundry', () => {
  return gulp.src('dist/**').pipe(gulp.dest(MODULEPATH))
})

gulp.task("update", gulp.series('build', 'foundry'))

