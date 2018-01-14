import { issueId, validate } from '../api';

test('issue ID', () => {
  expect(issueId({
    git: {
      url: '',
      branch: 'master',
      account: '',
      token: '',
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
      account: 'bbb',
      token: 'ccc',
    },
    commit: {
      message: 'beepro making commit',
      interval: 1,
    },
  };
  expect(validate({})).toBe(false);
  expect(validate({
    ...valid,
    git: { url: '' },
  })).toBe(false);
  expect(validate({
    ...valid,
    git: { account: '' },
  })).toBe(false);
  expect(validate({
    ...valid,
    git: { token: '' },
  })).toBe(false);
  expect(validate(valid)).toBe(true);
});
