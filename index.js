const { Transform } = require('stream');
// const relative = require('path').relative;
const linthtml = require('@linthtml/linthtml');
const PluginError = require('plugin-error');
const fancy = require('fancy-log');
const chalk = require('chalk');
const Table = require('table-layout');
const path = require('path');
const PLUGIN_NAME = 'gulp-linthtml';

/**
 * @typedef {Object} Issue 
 * @property {Number} line
 * @property {Number} column
 * @property {String} code
 * @property {Object} data
 */
/**
 * @typedef {Object} Report
 * @property {String} fileName - File path of the analysed file 
 * @property {Issue[]} issues - The issues found during fil analysis
 */

function print_position({ position: { start } }, maxLine, maxColumn) {
  const line = start.line.toString();
  const column = start.column.toString();
  return `${line.padStart(maxLine, ' ')}:${column.padEnd(maxColumn, ' ')}`;
}

function printLevel(issue) {
  return `${{
    warning: 'yellow warning',
    error: 'red error'
  }[issue.severity]}`;
}

function print_error(error) {
  if (error.code) {
    const ctx = new chalk.Instance({level: 0});
    const [type, code] = error.code.split('-');
    const error_message = linthtml.messages[`${type}_ERRORS`][code];
    return error_message(ctx, error.meta);
  }
  return error.message;
}


/**
 *  Output a report
 * 
 * @param {Report} report 
 */
function lintHTMLreporter(report) {
  let output = chalk`\n{underline ${report.fileName}}`;
  const maxLine = report.issues.reduce((max, cv) => Math.max(max, cv.line), -1).toString().length;
  const maxColumn = report.issues.reduce((max, cv) => Math.max(max, cv.column), -1).toString().length;

  const issues = [];

  report.issues.forEach(function(issue) {
    const msg = linthtml.messages.renderIssue(issue);
    const positionTxt = print_position(issue, maxLine, maxColumn);
    const level = printLevel(issue);
    issues.push({
      positions: chalk`{gray ${positionTxt}}`,
      level: chalk`{${level}}`,
      msg,
      rule: chalk`{gray ${issue.rule}}`
    });
  });

  const table = new Table(issues, { noTrim: true });
  output = `${output}\n${table.toString()}`;
  return output;
}

/**
 * Convenience method for creating a transform stream in object mode
 *
 * @param {Function} transform - An async function that is called for each stream chunk
 * @param {Function} [flush] - An async function that is called before closing the stream
 * @returns {stream} A transform stream
 */
function transform (transform, flush) {
  if (typeof flush === 'function') {
    return new Transform({
      objectMode: true,
      transform,
      flush
    });
  }

  return new Transform({
    objectMode: true,
    transform
  });
}

/**
 * @typedef {Object} GulpLintHTMLOptions
 * @property {Object} [rules] - An object containing a liste of valid LintHTML's rules
 * @property {string} [configFile] - File path to the LintHTML config file
 */

/**
 * @param {(String|GulpLintHTMLOptions)} [options] - Rules to convert
 * @returns {Object} converted options 
 */
function convertOptions(options = {}) {
  if (typeof options === 'string') {
    // basic config path overload: gulpLintHTML('path/to/config.json')
    options = {
      configFile: options
    };
  }
  return options;
}

/**
 * 
 * @param {(Strint|GulpLintHTMLOptions)} [options] - Configure rules for running LintHTML 
 * @param {Function} [reporter] - A custom reporter to format LintHTML errors
 * 
 * @returns {stream} gulp file stream
 */
function gulpLintHTML(options) {
  options = convertOptions(options);
  return transform((file, enc, cb) => {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'gulp-linthtml doesn\'t support vinyl files with Stream contents.'));
    }
    let linter = null;
    try {
      if (options.configFile) {
        linter = linthtml.from_config_path(options.configFile);
      } else if (options.rules) {
        linter = linthtml.fromConfig(options);
      } else {
        linter = linthtml.create_linters_for_files([path.relative(process.cwd(), file.path)]);
        linter = linter[0] ? linter[0].linter : null;
      }
    } catch (error) {
      return cb(new PluginError(PLUGIN_NAME, `gulp-linthtml - ${print_error(error)}`));
    }
    return getLintReport(file, linter, /*options */ cb);
  });
}

/**
 * 
 * @param {*} file 
 * @param {*} cb 
 */
function getLintReport(file, linter, /*options,*/ cb) {
  try {
    let p = linter.lint(file.contents.toString());
    p.catch(e => cb(new PluginError(PLUGIN_NAME, e)));
    p.then(reports => file.linthtml = reports)
      .then(() => cb(null, file));
  } catch (error) {
    return cb(new PluginError(PLUGIN_NAME, error.message));
  }
}

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a LintHTML result formatter
 * @returns {stream} gulp file stream
 */
gulpLintHTML.format = (/*formatter*/) => {

  const results = [];
  results.errorsCount = 0;
  results.warningsCount = 0;
  // results.warningCount = 0;
  return transform((file, enc, done) => {
    if (file.linthtml && file.linthtml.length > 0) {
      results.push({
        fileName: file.path,
        issues: file.linthtml
      });
      // results.push(file.linthtml);
      // // collect total error/warning count

      const errorsCount = file.linthtml.reduce((count, issue) => issue.severity === 'error' ? count + 1 : count, 0);
      const warningsCount = file.linthtml.reduce((count, issue) => issue.severity === 'warning' ? count + 1 : count, 0);
      results.errorsCount += errorsCount;
      results.warningsCount += warningsCount;
    }
    done(null, file);

  }, done => {
    const { errorsCount, warningsCount } = results;
    const problemsCount = errorsCount + warningsCount;
    let output = '\n';
    output = results.reduce((out, result) => {
      return out += lintHTMLreporter(result);
    }, output);
    output += '\n';

    if (results.errorCount !== 0) {
      output += chalk`  {red ✖ ${problemsCount} ${problemsCount > 1 ? 'problems' : 'problem'} (${errorsCount} ${errorsCount > 1 ? 'errors' : 'error'}, ${warningsCount} ${warningsCount > 1 ? 'warnings' : 'warning'})}`;
      output += '\n';
      fancy(output);
    } else if (results.warningCount !== 0) {
      output += chalk`  {yellow ✖ ${problemsCount} ${problemsCount > 1 ? 'problems' : 'problem'} (0 error, ${warningsCount} ${warningsCount > 1 ? 'warnings' : 'warning'})}`;
      output += '\n';
      fancy(output);
    }
    return done();
  });
};

/**
 * Fail when an LintHTML error is found in LintHTML results.
 *
 * @returns {stream} gulp file stream
 */
gulpLintHTML.failOnError = () => {
  return transform((file, enc, done) => {
    const errors = file.linthtml.filter(_ => _.severity === 'error');
    if (errors.length > 0) {
      const error = errors[0];
      return done(new PluginError(PLUGIN_NAME, {
        name: 'LintHTMLError',
        fileName: file.path,
        message: linthtml.messages.renderIssue(error),
        lineNumber: error.position.start.line
      }));
    }
    return done(null, file);
  });
};


module.exports = gulpLintHTML;