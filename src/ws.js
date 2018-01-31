import uuid from 'uuid';
import { init, changeUpstream } from './honey';


const honeys = {};
const queue = {};

export function send(ws, from, data) {
  const json = JSON.stringify(data);
  ws.send(json);
  // eslint-disable-next-line no-console
  console.log(`from:${from.id} to:${ws.id} data:${json}`);
}

export function suspendcast(ws) {
  // eslint-disable-next-line no-console
  console.log(`suspend sending to:${ws.id}`);
  if (queue[ws.id]) {
    return;
  }
  queue[ws.id] = [];
}

export function resumecast(ws) {
  // eslint-disable-next-line no-console
  console.log(`resume sending to:${ws.id}`);
  if (!queue[ws.id]) {
    return;
  }
  queue[ws.id].forEach(msg => send(ws, {}, msg));
  queue[ws.id] = null;
}

export function multicast(clients, msg, from, withoutSender = true) {
  clients.forEach((ws) => {
    if (!withoutSender || from.id !== ws.id) {
      if (queue[ws.id]) {
        queue[ws.id].push(msg);
      } else {
        send(ws, from, msg);
      }
    }
  });
}

export default function (app, mongoose) {
  app.ws('/ws/honeys/:id', (ws, req) => {
    // eslint-disable-next-line no-param-reassign
    ws.id = uuid.v4();
    // eslint-disable-next-line no-console
    console.log('connected!');
    suspendcast(ws);
    if (!honeys[req.params.id]) {
      honeys[req.params.id] = {
        ws: [],
        members: {},
      };
    }
    honeys[req.params.id].ws.push(ws);
    ws.on('close', () => {
      // eslint-disable-next-line no-param-reassign
      honeys[req.params.id].ws = honeys[req.params.id].ws.filter(client => client.id !== ws.id);
    });
    init({
      id: req.params.id,
      mongoose,
    }).then(({ honey, dance }) => {
      ws.on('message', (msg) => {
        let json = {};
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
          multicast(honeys[req.params.id].ws, {
            type: 'members',
            members: Object.values(honeys[req.params.id].members),
          }, ws, false);
          return;
        }
        dance({
          from: ws,
          honey,
          data: json,
        })
          .then(() => {
            const member = honeys[req.params.id].members[ws.id];
            multicast(honeys[req.params.id].ws, {
              ...json,
              who: member ? member.id : 'unknown',
            }, ws, true);
          });
      });
      dance({
        honey,
        data: {
          type: 'create',
          who: 'beepro',
          path: '.beerc',
          contents: JSON.stringify(honey.rc),
        },
      });
      changeUpstream(honey)
        .then(() =>
          send(ws, ws, {
            type: 'sync',
          }));
    }, () => {
      ws.send('{"error": "honey does not exists"}');
    });
  });
}
