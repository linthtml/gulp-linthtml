/* global describe, it*/
'use strict';

const path = require('path');
const linthtml = require('..');
const File = require('vinyl');
const stringToStream = require('from2-string');
const expect = require('chai').expect;

require('mocha');

const content = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>Document</title>
    </head>
    <body>
    </body>
</html>
`;

describe('gulp-linthtml plugin', () => {
  it('should support sharable config', done => {
    linthtml('./test/fixtures/config.json')
      .on('error', done)
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
        expect(report).to.have.property('line');
        expect(report).to.have.property('column');
        //   .and.have.property('ruleId', 'strict');

        done();
      })
      .end(new File({
        path: 'test/fixtures/test.html',
        contents: Buffer.from(content)
      }));
  });

  it('should produce expected message via buffer', done => {

    linthtml({rules: { 'html-req-lang': true }})
      .on('error', done)
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
        expect(report).to.have.property('line');
        expect(report).to.have.property('column');
        //   .and.have.property('ruleId', 'strict');

        done();
      })
      .end(new File({
        path: 'test/fixtures/test.html',
        contents: Buffer.from(content)
      }));
  });

  it('should ignore files with null content', done => {
    linthtml({rules: { 'html-req-lang': true }})
      .on('error', done)
      .on('data', file => {
        expect(file).to.exist;
        expect(file.contents).to.not.exist;
        expect(file.linthtml).to.not.exist;
        done();
      })
      .end(new File({
        path: 'test/fixtures',
        isDirectory: true
      }));
  });

  it('should emit an error when it takes a steam content', done => {
    linthtml()
      .on('error', err => {
        expect(err.plugin).to.equal('gulp-linthtml');
        expect(err.message).to.equal('gulp-linthtml doesn\'t support vinyl files with Stream contents.');
        done();
      })
      .end(new File({
        path: 'test/fixtures/text.html',
        contents: stringToStream('')
      }));
  });

  it('should emit an error when the config file specified does not exist', done => {
    linthtml('./test/fixtures/config.js')
      .on('error', err => {
        expect(err.plugin).to.equal('gulp-linthtml');
        expect(err.message).to.equal(`gulp-linthtml cannot read config file "${path.resolve(__dirname, 'fixtures/config.js')}"`);
        done();
      })
      .end(new File({
        path: 'test/fixtures/text.html',
        contents: Buffer.from(content)
      }));
  });

  // it('should emit an error when it fails to load a plugin', done => {
  //   const pluginName = 'this-is-unknown-plugin';
  //   linthtml({plugins: [pluginName]})
  //     .on('error', err => {
  //       err.plugin.should.equal('gulp-linthtml');
  //       err.message.should.equal(`Failed to load plugin this-is-unknown-plugin: Cannot find module 'linthtml-plugin-${
  //         pluginName
  //       }'`);

  //       done();
  //     })
  //     .end(new File({
  //       path: 'test/fixtures/test.html',
  //       contents: Buffer.from('')
  //     }));
  // });
});