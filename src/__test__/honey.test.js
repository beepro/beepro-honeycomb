import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs-extra';
import { getModel, create, find, init, cloneFromUpstream, changeUpstream } from '../honey';

const id = 'beepro-test';
const workspacePath = path.join(process.cwd(), 'workspace');
const clonepath = path.join(process.cwd(), 'workspace', id);
const gitpath = path.join(clonepath, '.git');
const helloPath = path.join(gitpath, 'hello.txt');
const inputs = {
  valid: {
    id,
    git: {
      url: 'https://github.com/sideroad/beepro-test.git',
      branch: 'master',
      account: 'sideroad',
      token: process.env.BEEPRO_TEST_TOKEN,
    },
    commit: {
      message: 'beepro making commit',
      interval: 60000,
    },
  },
};

beforeAll(() => {
  mongoose.connect(process.env.BEEPRO_MONGO_URL || 'mongodb://localhost:27017', {
    useMongoClient: true,
  });
  mongoose.Promise = global.Promise;
  fs.removeSync(clonepath);
  const Model = getModel(mongoose);
  return Model.findOneAndRemove({
    id,
  });
});

test('get honey model', () => {
  expect(getModel(mongoose)).toBeDefined();
});

test('cloneFromUpstream, changeUpstream', () =>
  cloneFromUpstream(inputs.valid, clonepath, { cwd: workspacePath })
    .then(() => {
      expect(fs.existsSync(gitpath)).toBe(true);
      fs.writeFileSync(path.join(clonepath, 'foo-bar.txt'), Math.random(), 'utf8');
    })
    .then(() =>
      changeUpstream()));

test('create, find, init, dance', () =>
  create({
    mongoose,
    ...inputs.valid,
  })
    .then(() =>
      find({
        mongoose,
        id,
      }))
    .then((honey) => {
      expect(honey.id).toBe(id);
      expect(honey.git.url).toBe('https://github.com/sideroad/beepro-test.git');
      expect(honey.git.branch).toBe('master');
      expect(honey.git.account).toBe('sideroad');
      expect(honey.git.token).toBeDefined();
      expect(honey.commit.message).toBe('beepro making commit');
      expect(honey.commit.interval).toBe(60000);
    })
    .then(() =>
      init({
        mongoose,
        id,
      }))
    .then(() => {
      // clone repository
      expect(fs.existsSync(helloPath)).toBe(false);
      expect(fs.existsSync(gitpath)).toBe(true);
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
      expect(fs.existsSync(gitpath)).toBe(true);
      expect(fs.existsSync(helloPath)).toBe(true);
      return { dance, honey };
    })
    .then(({ dance, honey }) => {
      const relativePath = path.relative(clonepath, helloPath);
      dance({
        honey,
        data: {
          type: 'change',
          who: 'sideroad',
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
          who: 'sideroad',
          path: relativePath,
          contents: 'aaa\nbbb',
        },
      });
      expect(fs.readFileSync(helloPath, 'utf8')).toBe('aaa\nbbb');
      dance({
        honey,
        data: {
          type: 'delete',
          who: 'sideroad',
          path: relativePath,
        },
      });
      expect(fs.existsSync(helloPath)).toBe(false);
    }));

afterAll(() => {
  mongoose.disconnect();
});
