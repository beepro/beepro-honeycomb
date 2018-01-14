import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs-extra';
import { getModel, create, find, init, cloneFromUpstream, changeUpstream } from '../honey';

jest.setTimeout(10000);
const id = 'beepro-test';
const workspacePath = path.join(process.cwd(), 'workspace');
const clonePath = path.join(process.cwd(), 'workspace', id);
const gitPath = path.join(clonePath, '.git');
const helloPath = path.join(gitPath, 'hello.txt');
const inputs = {
  valid: {
    id,
    git: {
      url: 'https://github.com/beepro/beepro-test-repository.git',
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
  fs.removeSync(clonePath);
  const Model = getModel(mongoose);
  return Model.findOneAndRemove({
    id,
  });
});

test('get honey model', () => {
  expect(getModel(mongoose)).toBeDefined();
});

test('cloneFromUpstream, changeUpstream', () =>
  cloneFromUpstream(inputs.valid, clonePath, { cwd: workspacePath })
    .then(() => {
      expect(fs.existsSync(gitPath)).toBe(true);
      fs.writeFileSync(path.join(clonePath, 'foo-bar.txt'), Math.random(), 'utf8');
    })
    .then(() =>
      changeUpstream(inputs.valid, { cwd: clonePath })));

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
      expect(honey.git.url).toBe('https://github.com/beepro/beepro-test-repository.git');
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
      const relativePath = path.relative(clonePath, helloPath);
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
