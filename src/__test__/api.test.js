import Express from 'express';
import compression from 'compression';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import request from 'supertest';
import fs from 'fs-extra';
import path from 'path';
import api, { issueId, validate } from '../api';
import util from './util';

jest.setTimeout(30000);
const id = '8a5aefd9954e8b73811501761f6981b764b7375f4dbe8d5d5ef3f9af6b15db49';

beforeAll(() =>
  util.init());

beforeEach(() =>
  util.clean(id));

test('issue ID', () => {
  expect(issueId({
    git: {
      url: '',
      branch: 'master',
    },
    commit: {
      message: 'beepro making commit',
      interval: 1,
    },
  })).toHaveLength(64);
});

test('validate', () => {
  const valid = {
    git: {
      url: 'aaa',
    },
    commit: {
      message: 'beepro making commit',
      interval: 1,
    },
  };
  expect(validate(undefined)).toBe(false);
  expect(validate({})).toBe(false);
  expect(validate({
    ...valid,
    git: { url: '' },
  })).toBe(false);
  expect(validate(valid)).toBe(true);
});

test('honey resource', () => {
  const app = new Express();

  app.use(compression());
  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  api(app, mongoose);
  return request(app)
    .post('/api/honeys')
    .type('json')
    .send({
      git: {
        url: 'https://github.com/beepro/beepro-test-repository.git',
        branch: 'master',
      },
    })
    .expect(201)
    .then((res) => {
      expect(res.body).toEqual({
        id,
        dance: {
          url: 'ws://localhost:5432/ws/honeys/8a5aefd9954e8b73811501761f6981b764b7375f4dbe8d5d5ef3f9af6b15db49',
        },
      });
    })
    .then(() =>
      request(app)
        .get(`/api/honeys/${id}`)
        .type('json')
        .send()
        .expect(200))
    .then((res) => {
      expect(res.body).toEqual({
        git: {
          branch: 'master',
          url: 'https://github.com/beepro/beepro-test-repository.git',
        },
        dance: {
          url: `ws://localhost:5432/ws/honeys/${id}`,
        },
      });
    })
    .then(() => {
      // prepare for test
      fs.mkdirSync(path.join(__dirname, '../../workspace', id));
    })
    .then(() =>
      request(app)
        .post(`/api/honeys/${id}/files/aaa/beepro.png`)
        .attach('file', 'src/__test__/beepro.png')
        .expect(200))
    .then(() => {
      expect(fs.existsSync(`workspace/${id}/aaa/beepro.png`)).toBe(true);
    });
});

afterAll(() =>
  util.clean(id));
