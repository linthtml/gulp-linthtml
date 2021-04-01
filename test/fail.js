/* global describe, it*/
'use strict';

const linthtml = require('..');
const File = require('vinyl');
const expect = require('chai').expect;

describe('gulp-linthtml failOnError', () => {
  it('should fail a file immediately if an error is found', done => {
    const lintStream = linthtml('./test/fixtures/config.json');

    function endWithoutError() {
      done(new Error('An error was not thrown before ending'));
    }

    lintStream.pipe(linthtml.failOnError())
      .on('error', function(err) {
        this.removeListener('finish', endWithoutError);
        expect(err).to.have.property('message');
        expect(err.message).to.equal("<HTML> tag should specify the language of the page using the \"lang\" attribute");
        expect(err).to.have.property('lineNumber');
        expect(err.lineNumber).to.equal(1);

        done();
      })
      .on('finish', endWithoutError);

    lintStream.write(new File({
      path: 'test/fixtures/test.html',
      contents: Buffer.from('<html></html>')
    }));

    lintStream.end();
  });

  it('should not fail a immediately if an issue with level warning is found', done => {
    const lintStream = linthtml('./test/fixtures/new_config_format.json');

    lintStream.pipe(linthtml.failOnError())
      .on('error', function() {
        done(new Error('Should not fail immediately for warning report'));
      })
      .on('data', file => {
        expect(file).to.exist;
        expect(file.contents).to.exist;
        expect(file.linthtml).to.exist;
        expect(file.linthtml)
          .to.be.instanceOf(Array)
          .and.have.lengthOf(1);
        
        // expect(file.linthtml).to.have.property('filePath', path.resolve('test/fixtures/test.html'));
        // expect(file.linthtml[0]).to.have.property('filePath', path.resolve('test/fixtures/test.html'));
        
        const report = file.linthtml[0];

        expect(report).to.have.property('rule');
        expect(report).to.have.property('position');
        //   .and.have.property('ruleId', 'strict');

        done();
      });

    lintStream.write(new File({
      path: 'test/fixtures/test.html',
      contents: Buffer.from('<html></html>')
    }));

    lintStream.end();
  });
});