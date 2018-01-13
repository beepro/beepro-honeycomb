import waggleDance from 'waggle-dance';
import fs from 'fs-extra';
import git from 'git-promise';
import path from 'path';
import url from 'url';

let model;

export function getModel(mongoose) {
  if (!model) {
    model = mongoose.model('Honey', {
      id: String,
      git: {
        url: String,
        branch: String,
        account: String,
        token: String,
      },
      commit: {
        message: String,
      },
    });
  }
  return model;
}

export function create({
  mongoose,
  id,
  git: {
    url: gitUrl,
    branch,
    account,
    token,
  },
  commit: {
    message = 'beepro making commit',
  },
}) {
  const Model = getModel(mongoose);
  return new Model({
    id,
    git: {
      url: gitUrl,
      branch,
      account,
      token,
    },
    commit: {
      message,
    },
  }).save();
}

export function find({
  mongoose,
  id,
}) {
  const Model = getModel(mongoose);
  return Model.findOne({
    id,
  });
}

export function dance({
  honey,
  data: {
    path: relativePath,
    type,
    contents,
    change,
  },
}) {
  return new Promise((resolve) => {
    let file;
    if (relativePath) {
      file = path.join(honey.path, relativePath);
    }
    if (type === 'create') {
      fs.writeFileSync(file, contents, 'utf8');
    }
    if (type === 'delete') {
      fs.removeSync(file);
    }
    if (type === 'change') {
      const origin = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, waggleDance.apply(origin, change), 'utf8');
    }
    resolve();
  });
}

export function init({ id, mongoose }) {
  return new Promise((resolve) => {
    find({
      mongoose,
      id,
    })
      .then((honey) => {
        const honeyPath = path.join(__dirname, '../workspace', honey.id);
        if (fs.existsSync(honeyPath)) {
          return {
            ...honey,
            path: honeyPath,
          };
        }
        fs.mkdirSync(honeyPath);
        const {
          protocol,
          host,
          pathname,
          search,
          hash,
        } = url.parse(honey.git.url);
        const cmd = `clone ${protocol}//${honey.git.account}:${honey.git.token}@${host}${pathname}${search || ''}${hash || ''} ${honey.id}`;
        // eslint-disable-next-line no-console
        console.log(`git ${cmd}`);
        const workspacePath = path.join(process.cwd(), 'workspace');
        return git(cmd, { cwd: workspacePath })
          .then(() =>
            git(`config --local user.name ${honey.git.account}`, { cwd: honeyPath }))
          .then(() => ({
            ...honey,
            path: honeyPath,
          }));
      })
      .then((honey) => {
        resolve({
          honey,
          dance,
        });
      });
  });
}
