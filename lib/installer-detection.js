'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = detect;

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var commands = {
  NPM: 'npm install',
  PIP: 'pip install',
  GEM: 'gem install',
  MAVEN: 'mvn clean install',
  GRADLE: 'gradle'
};

function detect(_ref) {
  var dir = _ref.dir;

  if (!_fsExtra2.default.existsSync(dir)) {
    throw Error('specified directory does not exists ' + dir);
  }
  if (_fsExtra2.default.existsSync(_path2.default.join(dir, 'package.json'))) {
    return commands.NPM;
  }
  if (_fsExtra2.default.existsSync(_path2.default.join(dir, 'Gemfile'))) {
    return commands.GEM;
  }
  if (_fsExtra2.default.existsSync(_path2.default.join(dir, 'pom.xml'))) {
    return commands.MAVEN;
  }
  if (_fsExtra2.default.existsSync(_path2.default.join(dir, 'build.gradle'))) {
    return commands.GRADLE;
  }
  return '';
}