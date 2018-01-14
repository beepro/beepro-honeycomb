'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.getModel = getModel;
exports.create = create;
exports.find = find;
exports.dance = dance;
exports.changeUpstream = changeUpstream;
exports.cloneFromUpstream = cloneFromUpstream;
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
var committer = {};
var workspacePath = _path2.default.join(process.cwd(), 'workspace');

function getModel(mongoose) {
  if (!model) {
    model = mongoose.model('Honey', {
      id: String,
      git: {
        url: String,
        branch: String,
        account: String,
        token: String
      },
      commit: {
        message: String,
        interval: Number
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
      token = _ref$git.token,
      _ref$commit = _ref.commit,
      _ref$commit$message = _ref$commit.message,
      message = _ref$commit$message === undefined ? 'beepro making commit' : _ref$commit$message,
      _ref$commit$interval = _ref$commit.interval,
      interval = _ref$commit$interval === undefined ? 60000 : _ref$commit$interval;

  var Model = getModel(mongoose);
  return new Model({
    id: id,
    git: {
      url: gitUrl,
      branch: branch,
      account: account,
      token: token
    },
    commit: {
      message: message,
      interval: interval
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
      contents = _ref3$data.contents,
      change = _ref3$data.change;

  return new Promise(function (resolve) {
    var file = void 0;
    if (relativePath) {
      file = _path2.default.join(honey.path, relativePath);
    }
    if (type === 'create') {
      _fsExtra2.default.writeFileSync(file, contents, 'utf8');
    }
    if (type === 'delete') {
      _fsExtra2.default.removeSync(file);
    }
    if (type === 'change') {
      var origin = _fsExtra2.default.readFileSync(file, 'utf8');
      _fsExtra2.default.writeFileSync(file, _waggleDance2.default.apply(origin, change), 'utf8');
    }
    resolve();
  });
}

function changeUpstream(honey, options) {
  return (0, _gitPromise2.default)('add .', options).then(function () {
    return (0, _gitPromise2.default)('commit -m ' + honey.commit.message);
  }).then(function () {
    return (0, _gitPromise2.default)('push origin');
  });
}

function cloneFromUpstream(honey, honeyPath, options) {
  var _url$parse = _url2.default.parse(honey.git.url),
      protocol = _url$parse.protocol,
      host = _url$parse.host,
      pathname = _url$parse.pathname,
      search = _url$parse.search,
      hash = _url$parse.hash;

  var cmd = 'clone ' + protocol + '//' + honey.git.account + ':' + honey.git.token + '@' + host + pathname + (search || '') + (hash || '') + ' ' + honey.id;
  // eslint-disable-next-line no-console
  console.log('git ' + cmd);
  return (0, _gitPromise2.default)(cmd, { cwd: workspacePath }).then(function () {
    return (0, _gitPromise2.default)('config --local user.name ' + honey.git.account, options);
  }).then(function () {
    return _extends({}, honey, {
      path: honeyPath
    });
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
      return cloneFromUpstream(honey, honeyPath, { cwd: honeyPath });
    }).then(function (honey) {
      if (!committer[honey.id]) {
        committer[honey.id] = setInterval(function () {
          changeUpstream(honey, { cwd: honey.path });
        }, honey.interval);
      }
      resolve({
        honey: honey,
        dance: dance
      });
    });
  });
}