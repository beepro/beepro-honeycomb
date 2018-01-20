'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.getModel = getModel;
exports.find = find;
exports.update = update;
exports.create = create;
exports.dance = dance;
exports.changeUpstream = changeUpstream;
exports.cloneFromUpstream = cloneFromUpstream;
exports.getRC = getRC;
exports.makeRC = makeRC;
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
var nabee = {
  account: 'beepro-nabee',
  email: 'beepro.nabee@gmail.com',
  token: process.env.BEEPRO_TOKEN
};

function getModel(mongoose) {
  if (!model) {
    model = mongoose.model('Honey', {
      id: String,
      git: {
        url: String,
        branch: String
      },
      commit: {
        message: String,
        interval: Number
      },
      dance: {
        url: String
      }
    });
  }
  return model;
}

function find(_ref) {
  var mongoose = _ref.mongoose,
      id = _ref.id;

  var Model = getModel(mongoose);
  return Model.findOne({
    id: id
  }).then(function (doc) {
    return doc ? doc.toObject() : null;
  });
}

function update(_ref2) {
  var mongoose = _ref2.mongoose,
      id = _ref2.id,
      honey = _ref2.honey;

  var Model = getModel(mongoose);
  return Model.findOneAndUpdate({
    id: id
  }, honey).then(function (doc) {
    return doc ? doc.toObject() : null;
  });
}

function create(_ref3) {
  var mongoose = _ref3.mongoose,
      id = _ref3.id,
      _ref3$git = _ref3.git;
  _ref3$git = _ref3$git === undefined ? {} : _ref3$git;
  var gitUrl = _ref3$git.url,
      branch = _ref3$git.branch,
      _ref3$commit = _ref3.commit;
  _ref3$commit = _ref3$commit === undefined ? {} : _ref3$commit;
  var message = _ref3$commit.message,
      interval = _ref3$commit.interval;

  return find({
    mongoose: mongoose,
    id: id
  }).then(function (honey) {
    if (honey) {
      return update({
        mongoose: mongoose,
        id: id,
        honey: honey
      });
    }
    var Model = getModel(mongoose);
    return new Model({
      id: id,
      git: {
        url: gitUrl,
        branch: branch
      },
      commit: {
        message: message,
        interval: interval
      },
      dance: {
        url: 'wss://honeycomb-v1.herokuapp.com/ws/honeys/' + id
      }
    }).save().then(function (doc) {
      return doc ? doc.toObject() : null;
    });
  });
}

function dance(_ref4) {
  var honey = _ref4.honey,
      _ref4$data = _ref4.data,
      relativePath = _ref4$data.path,
      type = _ref4$data.type,
      contents = _ref4$data.contents,
      change = _ref4$data.change;

  return new Promise(function (resolve) {
    var file = void 0;
    if (relativePath) {
      file = _path2.default.join(honey.path, relativePath);
    }
    if (type === 'create') {
      _fsExtra2.default.writeFileSync(file, contents, 'utf8');
    }
    if (type === 'delete' && _fsExtra2.default.existsSync(file)) {
      _fsExtra2.default.removeSync(file);
    }
    if (type === 'change' && _fsExtra2.default.existsSync(file)) {
      var origin = _fsExtra2.default.readFileSync(file, 'utf8');
      _fsExtra2.default.writeFileSync(file, _waggleDance2.default.apply(origin, change), 'utf8');
    }
    resolve();
  });
}

function changeUpstream(honey) {
  var message = honey.commit && honey.commit.message ? honey.commit.message : 'buzz buzz buzz';
  // eslint-disable-next-line no-console
  console.log('change upstream on ' + honey.path);
  return (0, _gitPromise2.default)('add .', { cwd: honey.path }).then(function () {
    return (0, _gitPromise2.default)('commit -m "' + message + '"', { cwd: honey.path });
  }).then(function () {
    return (0, _gitPromise2.default)('push origin', { cwd: honey.path });
  })
  // eslint-disable-next-line no-console
  .then(function () {
    return honey;
  }, function () {
    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return console.log(args) || honey;
  });
}

function cloneFromUpstream(honey) {
  var _url$parse = _url2.default.parse(honey.git.url),
      protocol = _url$parse.protocol,
      host = _url$parse.host,
      pathname = _url$parse.pathname,
      search = _url$parse.search,
      hash = _url$parse.hash;

  var cmd = 'clone ' + protocol + '//' + nabee.account + ':' + nabee.token + '@' + host + pathname + (search || '') + (hash || '') + ' ' + honey.id;
  // eslint-disable-next-line no-console
  console.log('git ' + cmd + ' on ' + workspacePath);
  return (0, _gitPromise2.default)(cmd, { cwd: workspacePath }).then(function () {
    return (0, _gitPromise2.default)('config --local user.name ' + nabee.account, { cwd: honey.path });
  }).then(function () {
    return (0, _gitPromise2.default)('config --local user.email ' + nabee.email, { cwd: honey.path });
  }).then(function () {
    return honey;
  });
}

function getRC(honey) {
  return {
    dance: {
      url: honey.dance.url
    }
  };
}

function makeRC(honey) {
  // eslint-disable-next-line no-console
  console.log('generate .beerc on ' + honey.path);
  _fsExtra2.default.writeFileSync(_path2.default.join(honey.path, '.beerc'), JSON.stringify(getRC(honey)), 'utf8');
  return changeUpstream(honey);
}

function init(_ref5) {
  var id = _ref5.id,
      mongoose = _ref5.mongoose;

  return find({
    mongoose: mongoose,
    id: id
  }).then(function (honey) {
    return _extends({}, honey, {
      path: _path2.default.join(__dirname, '../workspace', honey.id)
    });
  }).then(function (honey) {
    if (_fsExtra2.default.existsSync(honey.path)) {
      return honey;
    }
    return cloneFromUpstream(honey).then(function () {
      return makeRC(honey);
    });
  }).then(function (honey) {
    if (!committer[honey.id]) {
      var interval = honey.commit && honey.commit.interval ? honey.commit.interval : 1;
      committer[honey.id] = setInterval(function () {
        changeUpstream(honey);
      }, interval * 60000);
    }
    return {
      honey: _extends({}, honey, {
        rc: getRC(honey)
      }),
      dance: dance
    };
  });
}