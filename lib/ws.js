'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.send = send;
exports.suspendcast = suspendcast;
exports.resumecast = resumecast;
exports.multicast = multicast;
exports.memberscast = memberscast;

exports.default = function (app, mongoose) {
  app.ws('/ws/honeys/:id', function (ws, req) {
    // eslint-disable-next-line no-param-reassign
    ws.id = _uuid2.default.v4();
    // eslint-disable-next-line no-console
    console.log('connected!');
    suspendcast(ws);
    if (!honeys[req.params.id]) {
      honeys[req.params.id] = {
        ws: [],
        members: {}
      };
    }
    honeys[req.params.id].ws.push(ws);
    ws.on('close', function () {
      // eslint-disable-next-line no-param-reassign
      honeys[req.params.id].ws = honeys[req.params.id].ws.filter(function (client) {
        return client.id !== ws.id;
      });
      delete honeys[req.params.id].members[ws.id];
      memberscast(honeys[req.params.id]);
    });
    (0, _honey.init)({
      id: req.params.id,
      mongoose: mongoose
    }).then(function (_ref2) {
      var honey = _ref2.honey,
          dance = _ref2.dance;

      ws.on('message', function (msg) {
        var json = {};
        try {
          json = JSON.parse(msg);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);
          return;
        }
        if (json.type === 'resume') {
          resumecast(ws);
          return;
        }
        if (json.type === 'join') {
          honeys[req.params.id].members[ws.id] = json.user;
          memberscast(honeys[req.params.id]);
          return;
        }
        dance({
          from: ws,
          honey: honey,
          data: json
        }).then(function () {
          var member = honeys[req.params.id].members[ws.id];
          multicast(honeys[req.params.id].ws, _extends({}, json, {
            who: member ? member.id : 'unknown'
          }), ws, true);
        });
      });
      dance({
        honey: honey,
        data: {
          type: 'create',
          who: 'beepro',
          path: '.beerc',
          contents: JSON.stringify(honey.rc)
        }
      });
      (0, _honey.changeUpstream)(honey).then(function () {
        return send(ws, ws, {
          type: 'sync'
        });
      });
    }, function (error) {
      console.error(error);
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
  var withoutSender = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : true;

  clients.forEach(function (ws) {
    if (!withoutSender || from.id !== ws.id) {
      if (queue[ws.id]) {
        queue[ws.id].push(msg);
      } else {
        send(ws, from, msg);
      }
    }
  });
}

function memberscast(_ref) {
  var ws = _ref.ws,
      members = _ref.members;

  multicast(ws, {
    type: 'members',
    members: Object.values(members)
  }, ws, false);
}