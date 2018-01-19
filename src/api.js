import crypto from 'crypto';
import { create, find } from './honey';

const SECRET = process.env.BEEPRO_HASH_SECRET;

if (!SECRET) {
  throw Error('BEEPRO_HASH_SECRET have to be set in environment variable');
}

export function validate({ git = {} } = {}) {
  if (
    !git.url
  ) {
    return false;
  }
  return true;
}

export function issueId({ git: { url, branch = 'master' } = {} } = {}) {
  return crypto
    .createHmac('sha256', SECRET)
    .update(`${url}:${branch}`)
    .digest('hex');
}

export default function (app, mongoose) {
  app.post('/api/honeys', (req, res) => {
    if (!validate(req.body)) {
      res.status(400).json({
        errors: [
          {
            msg: 'git, account, token are required',
          },
        ],
      });
      return;
    }

    const id = issueId(req.body);

    create({
      mongoose,
      id,
      commit: {},
      ...req.body,
    }).then(({ dance: { url } }) => {
      res.status(201).json({
        dance: {
          url,
        },
      });
    });
  });

  app.get('/api/honeys/:id', (req, res) => {
    find({
      mongoose,
      id: req.params.id,
    }).then((honey) => {
      if (honey) {
        res.json({
          git: {
            url: honey.git.url,
            branch: honey.git.branch,
          },
          dance: {
            url: honey.dance.url,
          },
        });
      } else {
        res.status(404).json({});
      }
    });
  });
  return app;
}
