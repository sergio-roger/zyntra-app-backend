import { ChatGateway } from '../chat.gateway';

const makeSocket = (auth: Record<string, unknown>) => ({
  id: 'socket-1',
  handshake: { auth, headers: {} },
  join: jest.fn(),
  disconnect: jest.fn(),
  data: undefined as unknown,
});

describe('ChatGateway.handleConnection() — channel-scoped room', () => {
  let gateway: ChatGateway;

  beforeEach(() => {
    gateway = new ChatGateway({ verify: jest.fn() } as any);
  });

  it('joins both business:{id} and channel:{id} rooms when channelId is provided', () => {
    const client = makeSocket({ businessId: 'biz-1', channelId: 'chan-1' });

    gateway.handleConnection(client as any);

    expect(client.join).toHaveBeenCalledWith('business:biz-1');
    expect(client.join).toHaveBeenCalledWith('channel:chan-1');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('joins only business:{id} when channelId is absent (pre-migration widgets)', () => {
    const client = makeSocket({ businessId: 'biz-1' });

    gateway.handleConnection(client as any);

    expect(client.join).toHaveBeenCalledWith('business:biz-1');
    expect(client.join).not.toHaveBeenCalledWith(
      expect.stringMatching(/^channel:/),
    );
  });

  it('still rejects sockets with neither businessId nor a JWT token', () => {
    const client = makeSocket({ channelId: 'chan-1' });

    gateway.handleConnection(client as any);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });
});
