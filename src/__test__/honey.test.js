import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs-extra';
import {
  getModel,
  create,
  find,
  init,
  cloneFromUpstream,
  changeUpstream,
  makeRC,
} from '../honey';

jest.setTimeout(10000);
const id = 'beepro-test';
const honeyPath = path.join(process.cwd(), 'workspace', id);
const gitPath = path.join(honeyPath, '.git');
const helloPath = path.join(honeyPath, 'hello.txt');
const inputs = {
  valid: {
    id,
    git: {
      url: 'https://github.com/beepro/beepro-test-repository.git',
      branch: 'master',
      account: 'beepro-honeycomb',
      email: 'beepro.honeycomb@gmail.com',
      token: process.env.BEEPRO_TEST_TOKEN,
    },
    commit: {
      message: 'beepro making commit',
      interval: 1,
    },
    path: honeyPath,
  },
};
const honeys = {
  valid: {
    ...inputs.valid,
    dance: {
      url: 'wss://honeycomb-v1.herokuapp.com/ws/honeys/beepro-test',
    },
  },
};

beforeAll(() => {
  mongoose.connect(process.env.BEEPRO_MONGO_URL || 'mongodb://localhost:27017', {
    useMongoClient: true,
  });
  mongoose.Promise = global.Promise;
});

beforeEach(() => {
  fs.removeSync(honeyPath);
  const Model = getModel(mongoose);
  return Model.findOneAndRemove({
    id,
  });
});

test('get honey model', () => {
  expect(getModel(mongoose)).toBeDefined();
});

test('cloneFromUpstream, changeUpstream, makeRC', () =>
  cloneFromUpstream(honeys.valid)
    .then(() => {
      expect(fs.existsSync(gitPath)).toBe(true);
      fs.writeFileSync(path.join(honeyPath, 'foo-bar.txt'), Math.random(), 'utf8');
    })
    .then(() =>
      changeUpstream(honeys.valid))
    .then(() =>
      makeRC(honeys.valid))
    .then(() => {
      expect(fs.existsSync(path.join(honeyPath, '.beerc'))).toBe(true);
    }));

test('create, find, init, dance', () =>
  create({
    mongoose,
    ...inputs.valid,
  })
    .then((honey) => {
      expect(honey.id).toBe(id);
      expect(honey.dance.url).toBe(honeys.valid.dance.url);
      return find({
        mongoose,
        id,
      });
    })
    .then((honey) => {
      expect(honey.id).toBe(id);
      expect(honey.git.url).toBe('https://github.com/beepro/beepro-test-repository.git');
      expect(honey.git.branch).toBe('master');
      expect(honey.git.account).toBe('beepro-honeycomb');
      expect(honey.git.email).toBe('beepro.honeycomb@gmail.com');
      expect(honey.git.token).toBeDefined();
      expect(honey.commit.message).toBe('beepro making commit');
      expect(honey.commit.interval).toBe(1);
    })
    .then(() =>
      init({
        mongoose,
        id,
      }))
    .then(() => {
      // clone repository
      expect(fs.existsSync(helloPath)).toBe(false);
      expect(fs.existsSync(gitPath)).toBe(true);
      fs.outputFileSync(helloPath, 'hello!');
      expect(fs.existsSync(helloPath)).toBe(true);
    })
    .then(() =>
      init({
        mongoose,
        id,
      }))
    .then(({ dance, honey }) => {
      // do not clone repository again.
      expect(fs.existsSync(gitPath)).toBe(true);
      expect(fs.existsSync(helloPath)).toBe(true);
      return { dance, honey };
    })
    .then(({ dance, honey }) => {
      const relativePath = path.relative(honeyPath, helloPath);
      dance({
        honey,
        data: {
          type: 'change',
          who: 'beepro-honeycomb',
          path: relativePath,
          change: {
            from: {
              row: 0,
              col: 1,
            },
            to: {
              row: 0,
              col: 2,
            },
            text: 'foobar',
          },
        },
      });
      expect(fs.readFileSync(helloPath, 'utf8')).toBe('hfoobarllo!');
      dance({
        honey,
        data: {
          type: 'create',
          who: 'beepro-honeycomb',
          path: relativePath,
          contents: 'aaa\nbbb',
        },
      });
      expect(fs.readFileSync(helloPath, 'utf8')).toBe('aaa\nbbb');
      dance({
        honey,
        data: {
          type: 'delete',
          who: 'beepro-honeycomb',
          path: relativePath,
        },
      });
      expect(fs.existsSync(helloPath)).toBe(false);
    }));

afterAll(() => {
  mongoose.disconnect();
});
