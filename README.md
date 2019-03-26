# gulp-linthtml [![Build Status](https://travis-ci.org/linthtml/gulp-linthtml.svg)](https://travis-ci.org/linthtml/gulp-linthtml)

> A [gulp](https://gulpjs.com/) plugin for [LintHTML](https://github.com/linthtml/linthtml)

## Installation

[Use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/getting-started/what-is-npm).

```
npm install @linthml/gulp-linthtml
```

## Usage

```javascript
const {src} = require('gulp');
const linthtml = require('@linthtml/gulp-linthtml');

function lintHTML() {
  return src("app/**/*.html")
    .pipe(linthtml())
    .pipe(linthtml.format())
    .pipe(linthtml.failOnError());
}

lintHTML.description = "Analyse all HTML files using linthtml";
exports.default = lintHTML;
```

## API

### linthtml()

*No explicit configuration.* A `.linthtmlrc.*` file may be resolved relative to the gulpfile.

### linthtml(options)

#### options.rules

Type: `Object`

Set of [rules](https://github.com/linthtml/linthtml/blob/develop/docs/rules.md).

```javascript
{
  "rules":{
    "attr-bans": ["div", "center"],
    "attr-quote-style": "double",
    "html-req-lang": true
  }
}
```

#### options.configFile

Type: `String`

Path to the LintHTML rules configuration file.

### linthtml(configFilePath)

Type: `String`

Shorthand for defining `options.configFile`.

### linthtml.failOnError()

Stop a task/stream if a LintHTML error has been reported for any file.

```javascript
// Cause the stream to stop(/fail) before copying an invalid JS file to the output directory
gulp.src('**/*.html')
    .pipe(linthtml())
    .pipe(linthtml.failOnError());
```

### linthtml.format()

Format all linted files once. This should be used in the stream after piping through `linthtml`; otherwise, this will find no LintHTML results to format.
