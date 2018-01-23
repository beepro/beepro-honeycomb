'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.validate = validate;
exports.issueId = issueId;

exports.default = function (app, mongoose) {
  app.post('/api/honeys', function (req, res) {
    if (!validate(req.body)) {
      res.status(400).json({
        errors: [{
          msg: 'git.url are required'
        }]
      });
      return;
    }

    var id = issueId(req.body);

    (0, _honey.create)(_extends({
      mongoose: mongoose,
      id: id,
      commit: {}
    }, req.body)).then(function (_ref3) {
      var url = _ref3.dance.url;

      res.status(201).json({
        id: id,
        dance: {
          url: url
        }
      });
    });
  });

  app.get('/api/honeys/:id', function (req, res) {
    (0, _honey.find)({
      mongoose: mongoose,
      id: req.params.id
    }).then(function (honey) {
      if (honey) {
        res.json({
          git: {
            url: honey.git.url,
            branch: honey.git.branch
          },
          dance: {
            url: honey.dance.url
          }
        });
      } else {
        res.status(404).json({});
      }
    });
  });
  app.use('/api/honeys/:id/files/', upload.single('file'), function (req, res) {
    var relativePath = req.originalUrl.replace('/api/honeys/' + req.params.id + '/files/', '');
    var honeyPath = _path2.default.join(__dirname, '../workspace', req.params.id);
    if (req.params.id.match('\\.\\./') || relativePath.match('\\.\\./') || !_fsExtra2.default.existsSync(honeyPath)) {
      res.status(400).send('');
      return;
    }
    var to = _path2.default.join(honeyPath, relativePath);
    if (req.method === 'POST') {
      _fsExtra2.default.moveSync(req.file.path, to, { overwrite: true });
    } else if (req.method === 'DELETE') {
      _fsExtra2.default.removeSync(to);
    }
    res.send('');
  });
  return app;
};

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _multer = require('multer');

var _multer2 = _interopRequireDefault(_multer);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _honey = require('./honey');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SECRET = process.env.BEEPRO_HASH_SECRET;
var upload = (0, _multer2.default)({ dest: 'uploads/' });

if (!SECRET) {
  throw Error('BEEPRO_HASH_SECRET have to be set in environment variable');
}

function validate() {
  var _ref = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref$git = _ref.git,
      git = _ref$git === undefined ? {} : _ref$git;

  if (!git.url) {
    return false;
  }
  return true;
}

function issueId() {
  var _ref2 = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {},
      _ref2$git = _ref2.git;

  _ref2$git = _ref2$git === undefined ? {} : _ref2$git;
  var url = _ref2$git.url,
      _ref2$git$branch = _ref2$git.branch,
      branch = _ref2$git$branch === undefined ? 'master' : _ref2$git$branch;

  return _crypto2.default.createHmac('sha256', SECRET).update(url + ':' + branch).digest('hex');
}