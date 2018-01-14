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
      dance: {
        url: String,
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
    interval = 1,
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
    dance: {
      url: `wss://honeycomb-v1.herokuapp.com/ws/honeys/${id}`,
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
      git(`commit -m "${honey.commit.message}"`, options))
    .then(() =>
      git('push origin', options));
}

export function cloneFromUpstream(honey) {
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
      git(`config --local user.name ${honey.git.account}`, { cwd: honey.path }))
    .then(() => (honey));
}

export function makeRC(honey) {
  const config = {
    dance: {
      url: honey.dance.url,
    },
  };
  fs.writeFileSync(path.join(honey.path, '.beerc'), JSON.stringify(config), 'utf8');
  return changeUpstream(honey, { cwd: honey.path });
}

export function init({ id, mongoose }) {
  return new Promise((resolve) => {
    find({
      mongoose,
      id,
    })
      .then(honey =>
        ({
          ...honey,
          path: path.join(__dirname, '../workspace', honey.id),
        }))
      .then((honey) => {
        if (fs.existsSync(honey.path)) {
          return honey;
        }
        return cloneFromUpstream(honey)
          .then(() =>
            makeRC(honey));
      })
      .then((honey) => {
        if (!committer[honey.id]) {
          committer[honey.id] = setInterval(() => {
            changeUpstream(honey, { cwd: honey.path });
          }, honey.interval * 60000);
        }
        resolve({
          honey,
          dance,
        });
      });
  });
}
