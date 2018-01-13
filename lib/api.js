'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.validate = validate;
exports.issueId = issueId;

exports.default = function (app, mongoose) {
  app.post('/api/honeys', function (req, res) {
    if (validate(req.body)) {
      res.status(400).json({
        errors: [{
          msg: 'git, account, token are required'
        }]
      });
      return;
    }

    var id = issueId(req.body);

    (0, _honey.create)(_extends({
      mongoose: mongoose,
      id: id
    }, req.body)).then(function () {
      res.json({
        url: 'wss://honeycomb-v1.herokuapp.com/ws/honeys/' + id
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
          id: honey.id,
          git: {
            url: honey.git.url,
            branch: honey.git.branch,
            account: honey.git.account
          }
        });
      } else {
        res.status(404).json({});
      }
    });
  });
  return app;
};

var _crypto = require('crypto');

var _crypto2 = _interopRequireDefault(_crypto);

var _honey = require('./honey');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SECRET = process.env.BEEPRO_HASH_SECRET;

if (!SECRET) {
  throw Error('BEEPRO_HASH_SECRET have to be set in environment variable');
}

function validate(_ref) {
  var _ref$git = _ref.git,
      git = _ref$git === undefined ? {} : _ref$git;

  if (!git.url || !git.account || !git.token) {
    return false;
  }
  return true;
}

function issueId(_ref2) {
  var _ref2$git = _ref2.git,
      url = _ref2$git.url,
      _ref2$git$branch = _ref2$git.branch,
      branch = _ref2$git$branch === undefined ? 'master' : _ref2$git$branch,
      token = _ref2$git.token;

  return _crypto2.default.createHmac('sha256', SECRET).update(url + ':' + branch + ':' + token).digest('hex');
}