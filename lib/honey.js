'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.getModel = getModel;
exports.create = create;
exports.find = find;
exports.dance = dance;
exports.init = init;

var _waggleDance = require('waggle-dance');

var _waggleDance2 = _interopRequireDefault(_waggleDance);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _gitPromise = require('git-promise');

var _gitPromise2 = _interopRequireDefault(_gitPromise);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _url = require('url');

var _url2 = _interopRequireDefault(_url);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var model = void 0;

function getModel(mongoose) {
  if (!model) {
    model = mongoose.model('Honey', {
      id: String,
      git: {
        url: String,
        branch: String,
        account: String,
        token: String
      }
    });
  }
  return model;
}

function create(_ref) {
  var mongoose = _ref.mongoose,
      id = _ref.id,
      _ref$git = _ref.git,
      gitUrl = _ref$git.url,
      branch = _ref$git.branch,
      account = _ref$git.account,
      token = _ref$git.token;

  var Model = getModel(mongoose);
  return new Model({
    id: id,
    git: {
      url: gitUrl,
      branch: branch,
      account: account,
      token: token
    }
  }).save();
}

function find(_ref2) {
  var mongoose = _ref2.mongoose,
      id = _ref2.id;

  var Model = getModel(mongoose);
  return Model.findOne({
    id: id
  });
}

function dance(_ref3) {
  var honey = _ref3.honey,
      _ref3$data = _ref3.data,
      relativePath = _ref3$data.path,
      type = _ref3$data.type,
      change = _ref3$data.change;

  return new Promise(function (resolve) {
    if (type === 'change') {
      var file = _path2.default.join(honey.path, relativePath);
      var origin = _fsExtra2.default.readFileSync(file, 'utf8');
      _fsExtra2.default.writeFileSync(file, _waggleDance2.default.apply(origin, change), 'utf8');
    }
    resolve();
  });
}

function init(_ref4) {
  var id = _ref4.id,
      mongoose = _ref4.mongoose;

  return new Promise(function (resolve) {
    find({
      mongoose: mongoose,
      id: id
    }).then(function (honey) {
      var honeyPath = _path2.default.join(__dirname, '../workspace', honey.id);
      if (_fsExtra2.default.existsSync(honeyPath)) {
        return _extends({}, honey, {
          path: honeyPath
        });
      }
      _fsExtra2.default.mkdirSync(honeyPath);

      var _url$parse = _url2.default.parse(honey.git.url),
          protocol = _url$parse.protocol,
          host = _url$parse.host,
          pathname = _url$parse.pathname,
          search = _url$parse.search,
          hash = _url$parse.hash;

      var cmd = 'clone ' + protocol + '//' + honey.git.account + ':' + honey.git.token + '@' + host + pathname + (search || '') + (hash || '') + ' ' + honey.id;
      // eslint-disable-next-line no-console
      console.log('git ' + cmd);
      var workspacePath = _path2.default.join(process.cwd(), 'workspace');
      return (0, _gitPromise2.default)(cmd, { cwd: workspacePath }).then(function () {
        return (0, _gitPromise2.default)('config --local user.name ' + honey.git.account, { cwd: honeyPath });
      }).then(function () {
        return _extends({}, honey, {
          path: honeyPath
        });
      });
    }).then(function (honey) {
      resolve({
        honey: honey,
        dance: dance
      });
    });
  });
}