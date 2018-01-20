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

function wsUrl() {
  const host = process.env.GLOBAL_HOST || 'localhost';
  const port = process.env.GLOBAL_PORT || '5432';
  let protocol;
  if (port === '443') {
    protocol = 'wss';
  } else {
    protocol = 'ws';
  }
  return `${protocol}://${host}${port !== '443' && port !== '80' ? `:${port}` : ''}`;
}

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

export function find({
  mongoose,
  id,
}) {
  const Model = getModel(mongoose);
  return Model.findOne({
    id,
  }).then(doc => (doc ? doc.toObject() : null));
}

export function update({
  mongoose,
  id,
  honey,
}) {
  const Model = getModel(mongoose);
  return Model.findOneAndUpdate({
    id,
  }, honey).then(doc => (doc ? doc.toObject() : null));
}

export function create({
  mongoose,
  id,
  git: {
    url: gitUrl,
    branch,
  } = {},
  commit: {
    message,
    interval,
  } = {},
}) {
  return find({
    mongoose,
    id,
  }).then((honey) => {
    if (honey) {
      return update({
        mongoose,
        id,
        honey,
      });
    }
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
        url: `${wsUrl()}/ws/honeys/${id}`,
      },
    }).save().then(doc => (doc ? doc.toObject() : null));
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
    if (type === 'delete' && fs.existsSync(file)) {
      fs.removeSync(file);
    }
    if (type === 'change' && fs.existsSync(file)) {
      const origin = fs.readFileSync(file, 'utf8');
      fs.writeFileSync(file, waggleDance.apply(origin, change), 'utf8');
    }
    resolve();
  });
}

export function changeUpstream(honey) {
  const message = honey.commit && honey.commit.message ? honey.commit.message : 'buzz buzz buzz';
  // eslint-disable-next-line no-console
  console.log(`change upstream on ${honey.path}`);
  return git('add .', { cwd: honey.path })
    .then(() =>
      git(`commit -m "${message}"`, { cwd: honey.path }))
    .then(() =>
      git('push origin', { cwd: honey.path }))
    // eslint-disable-next-line no-console
    .then(() => honey, (...args) => console.log(args) || honey);
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
        const interval = honey.commit && honey.commit.interval ? honey.commit.interval : 1;
        committer[honey.id] = setInterval(() => {
          changeUpstream(honey);
        }, interval * 60000);
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
