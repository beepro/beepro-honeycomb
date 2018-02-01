import crypto from 'crypto';
import multer from 'multer';
import fs from 'fs-extra';
import path from 'path';
import { create, find } from './honey';

const SECRET = process.env.BEEPRO_HASH_SECRET || 'AWESOME BEEPRO';
const upload = multer({ dest: 'uploads/' });

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
            msg: 'git.url are required',
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
        id,
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
  app.use('/api/honeys/:id/files/', upload.single('file'), (req, res) => {
    const relativePath = req.originalUrl.replace(`/api/honeys/${req.params.id}/files/`, '');
    const honeyPath = path.join(__dirname, '../workspace', req.params.id);
    if (
      req.params.id.match('\\.\\./') ||
      relativePath.match('\\.\\./')
    ) {
      res.status(400).send('');
      return;
    }
    const to = path.join(honeyPath, relativePath);
    if (req.method === 'POST') {
      fs.ensureDirSync(path.dirname(to));
      fs.moveSync(req.file.path, to, { overwrite: true });
    }
    res.send('');
  });
  return app;
}
