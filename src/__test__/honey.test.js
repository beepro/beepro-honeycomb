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
import util from './util';

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
      account: 'beepro-nabee',
      email: 'beepro.nabee@gmail.com',
      token: process.env.BEEPRO_TOKEN,
    },
    path: honeyPath,
  },
};
const honeys = {
  valid: {
    ...inputs.valid,
    commit: {
      message: 'buzz buzz buzz',
      interval: 1,
    },
    dance: {
      url: 'wss://honeycomb-v1.herokuapp.com/ws/honeys/beepro-test',
    },
  },
};

beforeAll(() =>
  util.init());

beforeEach(() =>
  util.clean());

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
          who: 'beepro-nabee',
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
          who: 'beepro-nabee',
          path: relativePath,
          contents: 'aaa\nbbb',
        },
      });
      expect(fs.readFileSync(helloPath, 'utf8')).toBe('aaa\nbbb');
      dance({
        honey,
        data: {
          type: 'delete',
          who: 'beepro-nabee',
          path: relativePath,
        },
      });
      expect(fs.existsSync(helloPath)).toBe(false);
    }));

afterAll(() =>
  util.clean());
