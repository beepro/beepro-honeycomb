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
      send(ws, from, msg);
    });
  };

  app.ws('/ws/honeys/:id', (ws, req) => {
    if (!honeys[req.params.id]) {
      honeys[req.params.id] = [];
    }
    const clients = honeys[req.params.id];
    clients.push(ws);
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
    });
  });
}
