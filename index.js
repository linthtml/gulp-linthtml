const { Transform } = require('stream');
// const relative = require('path').relative;
const linthtml = require('@linthtml/linthtml');
const PluginError = require('plugin-error');
const fancy = require('fancy-log');
const chalk = require('chalk');

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

/**
 *  Output a report
 * 
 * @param {Report} report 
 */
function lintHTMLreporter(report) {
  let output = chalk`\n{underline ${report.fileName}}`;
  const maxLine = report.issues.reduce((max, cv) => Math.max(max, cv.line), -1).toString().length;
  const maxColumn = report.issues.reduce((max, cv) => Math.max(max, cv.column), -1).toString().length;

  report.issues.forEach(function (issue) {
    const line = issue.line.toString();
    const column = issue.column.toString();
    const space = '  ';
    const msg = linthtml.messages.renderIssue(issue);
    output += chalk `\n  {gray ${line.padStart(maxLine, ' ')}:${column.padEnd(maxColumn, ' ')}}${space}{red error}${space}{white ${msg}}${space}{gray ${issue.rule}}`;
  });
  output += '\n';

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
 * @param {(Strint|GulpLintHTMLOptions)} [options] - Rules to convert
 * @returns {Object} converted options 
 */
function convertOptions(options) {
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
    // const filePath = relative(process.cwd(), file.path);

    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'gulp-linthtml doesn\'t support vinyl files with Stream contents.'));
    }

    getLintReport(file, cb);
  });
}

/**
 * 
 * @param {*} file 
 * @param {*} cb 
 */
async function getLintReport(file, cb) {
  let result;

  try {
    result = await linthtml(file.contents.toString());
    // result = await linthtml(file.content, globalConfig); // globalConfig not defined
  } catch (e) {
    return cb(new PluginError(PLUGIN_NAME, e));
  }

  file.linthml = result;
  return cb(null, file);
}

/**
 * Wait until all files have been linted and format all results at once.
 *
 * @param {(String|Function)} [formatter=stylish] - The name or function for a LintHTML result formatter
 * @returns {stream} gulp file stream
 */
gulpLintHTML.format = (/*formatter*/) => {

  const results = [];
  results.errorCount = 0;
  // results.warningCount = 0;
  return transform((file, enc, done) => {
    if (file.linthml) {
      results.push({
        fileName: file.path,
        issues: file.linthml
      });
      // results.push(file.linthml);
      // // collect total error/warning count
      results.errorCount += file.linthml.length;
      // results.warningCount += file.eslint.warningCount;
    }
    done(null, file);

  }, done => {
    if (results.errorCount !== 0) {
      let output = '\n';

      output = results.reduce((out, result) => {
        return out += lintHTMLreporter(result);
      }, output);

      const errorsCount = results.reduce((count, report) => count + report.issues.length, 0);
      output += '\n';
      output += chalk`  {red.bold ✖ ${errorsCount} ${errorsCount > 1 ? 'errors' : 'error'}}`;
      output += '\n';
      fancy(output);
    }
    return done();
  });
};


module.exports = gulpLintHTML;