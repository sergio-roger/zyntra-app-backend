import { ChatGateway } from '../chat.gateway';
import { ChatService } from '../chat.service';
import { ChatRateLimitGuard } from '../guards/chat-rate-limit.guard';
import { JwtService } from '@nestjs/jwt';
import { WidgetSessionService } from '@/modules/widget-session/widget-session.service';
import { UnauthorizedException } from '@nestjs/common';
import { Socket } from 'socket.io';

const makeSocket = (auth: Record<string, unknown>) => ({
  id: 'socket-1',
  handshake: { auth, headers: {} },
  join: jest.fn(),
  disconnect: jest.fn(),
  data: undefined as unknown,
});

const WIDGET_PAYLOAD = {
  businessId: 'biz-1',
  channelId: 'chan-1',
  visitorFingerprint: 'fp-1',
  iat: 0,
  exp: 0,
};

describe('ChatGateway.handleConnection() — widget session (visitor)', () => {
  let gateway: ChatGateway;
  let widgetSessionService: { verify: jest.Mock };
  let jwtService: { verify: jest.Mock };

  beforeEach(() => {
    widgetSessionService = { verify: jest.fn() };
    jwtService = { verify: jest.fn() };
    gateway = new ChatGateway(
      jwtService as unknown as JwtService,
      widgetSessionService as unknown as WidgetSessionService,
      {} as unknown as ChatService,
      {} as unknown as ChatRateLimitGuard,
    );
  });

  it('joins business:{id} and channel:{id} rooms when the widget session token is valid', () => {
    widgetSessionService.verify.mockReturnValue(WIDGET_PAYLOAD);
    const client = makeSocket({ token: 'widget.session.token' });

    gateway.handleConnection(client as unknown as Socket);

    expect(widgetSessionService.verify).toHaveBeenCalledWith(
      'widget.session.token',
    );
    expect(client.join).toHaveBeenCalledWith('business:biz-1');
    expect(client.join).toHaveBeenCalledWith('channel:chan-1');
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data).toMatchObject({
      kind: 'visitor',
      businessId: 'biz-1',
      channelId: 'chan-1',
    });
  });

  it('attaches to the conversation room when conversationId is provided alongside the token', () => {
    widgetSessionService.verify.mockReturnValue(WIDGET_PAYLOAD);
    const client = makeSocket({
      token: 'widget.session.token',
      conversationId: 'conv-9',
    });

    gateway.handleConnection(client as unknown as Socket);

    expect(client.join).toHaveBeenCalledWith('conversation:conv-9');
  });

  it('rejects sockets with no token at all', () => {
    const client = makeSocket({});

    gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
    expect(widgetSessionService.verify).not.toHaveBeenCalled();
  });

  it('never trusts raw businessId/channelId from the handshake (legacy plaintext auth is gone)', () => {
    // No token, only the old-style plaintext fields — must be rejected outright.
    const client = makeSocket({ businessId: 'biz-1', channelId: 'chan-1' });

    gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });
});

describe('ChatGateway.handleConnection() — agent (staff JWT)', () => {
  let gateway: ChatGateway;
  let widgetSessionService: { verify: jest.Mock };
  let jwtService: { verify: jest.Mock };

  beforeEach(() => {
    widgetSessionService = {
      verify: jest.fn(() => {
        throw new UnauthorizedException();
      }),
    };
    jwtService = { verify: jest.fn() };
    gateway = new ChatGateway(
      jwtService as unknown as JwtService,
      widgetSessionService as unknown as WidgetSessionService,
      {} as unknown as ChatService,
      {} as unknown as ChatRateLimitGuard,
    );
  });

  it('falls back to the staff JWT when the token is not a valid widget session', () => {
    jwtService.verify.mockReturnValue({ business_id: 'biz-1' });
    const client = makeSocket({ token: 'staff.jwt.token' });

    gateway.handleConnection(client as unknown as Socket);

    expect(client.join).toHaveBeenCalledWith('business:biz-1');
    expect(client.disconnect).not.toHaveBeenCalled();
    expect(client.data).toMatchObject({ kind: 'agent', businessId: 'biz-1' });
  });

  it('rejects when the token is neither a valid widget session nor a valid staff JWT', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });
    const client = makeSocket({ token: 'garbage' });

    gateway.handleConnection(client as unknown as Socket);

    expect(client.disconnect).toHaveBeenCalled();
    expect(client.join).not.toHaveBeenCalled();
  });
});
