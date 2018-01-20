import uuid from 'uuid';
import { init } from './honey';

export default function (app, mongoose) {
  const send = (ws, from, data) => {
    const json = JSON.stringify(data);
    ws.send(json);
    // eslint-disable-next-line no-console
    console.log(`from:${from} to:${ws.id} data:${json}`);
  };

  const honeys = {};

  const multicast = (clients, msg, from) => {
    clients.forEach((ws) => {
      if (from.id !== ws.id) {
        send(ws, from, msg);
      }
    });
  };

  app.ws('/ws/honeys/:id', (ws, req) => {
    // eslint-disable-next-line no-param-reassign
    ws.id = uuid.v4();
    // eslint-disable-next-line no-console
    console.log('connected!');
    if (!honeys[req.params.id]) {
      honeys[req.params.id] = [];
    }
    let clients = honeys[req.params.id];
    clients.push(ws);
    ws.on('close', () => {
      // eslint-disable-next-line no-param-reassign
      clients = honeys[req.params.id].filter(client => client.id !== ws.id);
    });
    init({
      id: req.params.id,
      mongoose,
    }).then(({ honey, dance }) => {
      ws.on('message', (msg) => {
        dance({
          honey,
          data: JSON.parse(msg),
        })
          .then(() => {
            multicast(clients, msg, ws.id);
          });
      });
      dance({
        honey,
        data: {
          type: 'create',
          who: 'beepro',
          path: '.beerc',
          contents: honey.rc,
        },
      });
    });
  });
}
