'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.send = send;
exports.suspendcast = suspendcast;
exports.resumecast = resumecast;
exports.multicast = multicast;

exports.default = function (app, mongoose) {
  app.ws('/ws/honeys/:id', function (ws, req) {
    // eslint-disable-next-line no-param-reassign
    ws.id = _uuid2.default.v4();
    // eslint-disable-next-line no-console
    console.log('connected!');
    suspendcast(ws);
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
        if (json.type === 'resume') {
          resumecast(ws);
          return;
        }
        dance({
          from: ws,
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
          contents: JSON.stringfy(honey.rc)
        }
      });
      (0, _honey.changeUpstream)(honey).then(function () {
        return send(ws, ws, {
          type: 'sync'
        });
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

var honeys = {};
var queue = {};

function send(ws, from, data) {
  var json = JSON.stringify(data);
  ws.send(json);
  // eslint-disable-next-line no-console
  console.log('from:' + from.id + ' to:' + ws.id + ' data:' + json);
}

function suspendcast(ws) {
  // eslint-disable-next-line no-console
  console.log('suspend sending to:' + ws.id);
  if (queue[ws.id]) {
    return;
  }
  queue[ws.id] = [];
}

function resumecast(ws) {
  // eslint-disable-next-line no-console
  console.log('resume sending to:' + ws.id);
  if (!queue[ws.id]) {
    return;
  }
  queue[ws.id].forEach(function (msg) {
    return send(ws, {}, msg);
  });
  queue[ws.id] = null;
}

function multicast(clients, msg, from) {
  clients.forEach(function (ws) {
    if (queue[ws.id]) {
      queue[ws.id].push(msg);
    } else if (from.id !== ws.id) {
      send(ws, from, msg);
    }
  });
}
