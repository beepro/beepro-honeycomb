import { send, multicast, suspendcast, resumecast } from '../ws';

test('send', () => {
  const send1Fn = jest.fn();
  const send2Fn = jest.fn();
  send({
    id: 1,
    send: send1Fn,
  }, {
    id: 2,
    send: send2Fn,
  }, { a: 1 });
  expect(send1Fn).toHaveBeenCalledTimes(1);
  expect(send2Fn).not.toHaveBeenCalled();
});

test('multicast, suspendcast, resumecast', () => {
  const send1Fn = jest.fn();
  const send2Fn = jest.fn();
  const sender1 = {
    id: 1,
    send: send1Fn,
  };
  const sender2 = {
    id: 2,
    send: send2Fn,
  };
  // multicast to all sender without sender from
  multicast([sender1, sender2], { a: 1 }, sender1);
  expect(send1Fn).not.toHaveBeenCalled();
  expect(send2Fn).toHaveBeenCalledTimes(1);

  // suspend multicast to the sender
  suspendcast(sender2);
  multicast([sender1, sender2], { a: 1 }, sender1);
  multicast([sender1, sender2], { a: 2 }, sender1);
  expect(send1Fn).not.toHaveBeenCalled();
  expect(send2Fn).toHaveBeenCalledTimes(1);

  // resume multicast to the sender
  resumecast(sender2);
  expect(send1Fn).not.toHaveBeenCalled();
  expect(send2Fn).toHaveBeenCalledTimes(3);
  multicast([sender1, sender2], { a: 2 }, sender1);
  expect(send1Fn).not.toHaveBeenCalled();
  expect(send2Fn).toHaveBeenCalledTimes(4);
});
