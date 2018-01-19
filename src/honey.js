import waggleDance from 'waggle-dance';
import fs from 'fs-extra';
import git from 'git-promise';
import path from 'path';
import url from 'url';

let model;
const committer = {};
const workspacePath = path.join(process.cwd(), 'workspace');
const nabee = {
  account: 'beepro-nabee',
  email: 'beepro.nabee@gmail.com',
  token: process.env.BEEPRO_TOKEN,
};

export function getModel(mongoose) {
  if (!model) {
    model = mongoose.model('Honey', {
      id: String,
      git: {
        url: String,
        branch: String,
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
  } = {},
  commit: {
    message = 'buzz buzz buzz',
    interval = 1,
  } = {},
}) {
  const Model = getModel(mongoose);
  return new Model({
    id,
    git: {
      url: gitUrl,
      branch,
    },
    commit: {
      message,
      interval,
    },
    dance: {
      url: `wss://honeycomb-v1.herokuapp.com/ws/honeys/${id}`,
    },
  }).save().then(doc => doc.toObject());
}

export function find({
  mongoose,
  id,
}) {
  const Model = getModel(mongoose);
  return Model.findOne({
    id,
  }).then(doc => doc.toObject());
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

export function changeUpstream(honey) {
  // eslint-disable-next-line no-console
  console.log(`change upstream on ${honey.path}`);
  return git('add .', { cwd: honey.path })
    .then(() =>
      git(`commit -m "${honey.commit.message}"`, { cwd: honey.path }))
    .then(() =>
      git('push origin', { cwd: honey.path }))
    .then(() => honey, () => honey);
}

export function cloneFromUpstream(honey) {
  const {
    protocol,
    host,
    pathname,
    search,
    hash,
  } = url.parse(honey.git.url);
  const cmd = `clone ${protocol}//${nabee.account}:${nabee.token}@${host}${pathname}${search || ''}${hash || ''} ${honey.id}`;
  // eslint-disable-next-line no-console
  console.log(`git ${cmd} on ${workspacePath}`);
  return git(cmd, { cwd: workspacePath })
    .then(() =>
      git(`config --local user.name ${nabee.account}`, { cwd: honey.path }))
    .then(() =>
      git(`config --local user.email ${nabee.email}`, { cwd: honey.path }))
    .then(() => honey);
}

export function getRC(honey) {
  return {
    dance: {
      url: honey.dance.url,
    },
  };
}

export function makeRC(honey) {
  // eslint-disable-next-line no-console
  console.log(`generate .beerc on ${honey.path}`);
  fs.writeFileSync(path.join(honey.path, '.beerc'), JSON.stringify(getRC(honey)), 'utf8');
  return changeUpstream(honey);
}

export function init({ id, mongoose }) {
  return find({
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
          changeUpstream(honey);
        }, honey.interval * 60000);
      }
      return ({
        honey: {
          ...honey,
          rc: getRC(honey),
        },
        dance,
      });
    });
}
