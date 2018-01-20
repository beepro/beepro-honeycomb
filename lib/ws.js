'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

exports.default = function (app, mongoose) {
  var send = function send(ws, from, data) {
    var json = JSON.stringify(data);
    ws.send(json);
    // eslint-disable-next-line no-console
    console.log('from:' + from.id + ' to:' + ws.id + ' data:' + json);
  };

  var honeys = {};

  var multicast = function multicast(clients, msg, from) {
    clients.forEach(function (ws) {
      if (from.id !== ws.id) {
        send(ws, from, msg);
      }
    });
  };

  app.ws('/ws/honeys/:id', function (ws, req) {
    // eslint-disable-next-line no-param-reassign
    ws.id = _uuid2.default.v4();
    // eslint-disable-next-line no-console
    console.log('connected!');
    if (!honeys[req.params.id]) {
      honeys[req.params.id] = [];
    }
    honeys[req.params.id].push(ws);
    ws.on('close', function () {
      // eslint-disable-next-line no-param-reassign
      honeys[req.params.id] = honeys[req.params.id].filter(function (client) {
        return client.id !== ws.id;
      });
    });
    (0, _honey.init)({
      id: req.params.id,
      mongoose: mongoose
    }).then(function (_ref) {
      var honey = _ref.honey,
          dance = _ref.dance;

      ws.on('message', function (msg) {
        var json = {};
        try {
          json = JSON.parse(msg);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);
        }
        dance({
          honey: honey,
          data: json
        }).then(function () {
          multicast(honeys[req.params.id], json, ws);
        });
      });
      dance({
        honey: honey,
        data: {
          type: 'create',
          who: 'beepro',
          path: '.beerc',
          contents: honey.rc
        }
      });
    }, function () {
      ws.send('{"error": "honey does not exists"}');
    });
  });
};

var _uuid = require('uuid');

var _uuid2 = _interopRequireDefault(_uuid);

var _honey = require('./honey');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }