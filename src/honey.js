import waggleDance from 'waggle-dance';
import fs from 'fs-extra';
import git from 'git-promise';
import path from 'path';
import url from 'url';

let model;
const committer = {};
const workspacePath = path.join(process.cwd(), 'workspace');

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
        interval: Number,
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
    interval = 60000,
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
      interval,
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

export function changeUpstream(honey, options) {
  return git('add .', options)
    .then(() =>
      git(`commit -m ${honey.commit.message}`))
    .then(() =>
      git('push origin'));
}

export function cloneFromUpstream(honey, honeyPath, options) {
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
  return git(cmd, { cwd: workspacePath })
    .then(() =>
      git(`config --local user.name ${honey.git.account}`, options))
    .then(() => ({
      ...honey,
      path: honeyPath,
    }));
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
        return cloneFromUpstream(honey, honeyPath, { cwd: honeyPath });
      })
      .then((honey) => {
        if (!committer[honey.id]) {
          committer[honey.id] = setInterval(() => {
            changeUpstream(honey, { cwd: honey.path });
          }, honey.interval);
        }
        resolve({
          honey,
          dance,
        });
      });
  });
}
