import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRateLimitGuard } from '../guards/chat-rate-limit.guard';
import { WidgetSessionPayload } from '@/modules/widget-session/interfaces/widget-session-payload.interface';
import Redis from 'ioredis';

const makeRedis = () => ({
  incr: jest.fn(),
  expire: jest.fn(),
});

const makeConfig = (overrides: Record<string, number> = {}) =>
  ({
    get: (key: string, fallback: number) => overrides[key] ?? fallback,
  }) as unknown as ConfigService;

function makeContext(widgetSession?: Partial<WidgetSessionPayload>) {
  const req = { widgetSession, headers: {} };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

const SESSION: WidgetSessionPayload = {
  businessId: 'biz-1',
  channelId: 'chan-1',
  visitorFingerprint: 'fp-1',
  iat: 0,
  exp: 0,
};

describe('ChatRateLimitGuard', () => {
  let redis: ReturnType<typeof makeRedis>;
  let guard: ChatRateLimitGuard;

  beforeEach(() => {
    redis = makeRedis();
    guard = new ChatRateLimitGuard(
      redis as unknown as Redis,
      makeConfig({ CHAT_RATE_LIMIT_MAX: 3, CHAT_RATE_LIMIT_WINDOW_SEC: 60 }),
    );
  });

  it('allows the request while under the limit', async () => {
    redis.incr.mockResolvedValue(1);

    const allowed = await guard.canActivate(makeContext(SESSION));

    expect(allowed).toBe(true);
    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:chan-1:fp-1');
    expect(redis.expire).toHaveBeenCalledWith('ratelimit:chat:chan-1:fp-1', 60);
  });

  it('does not reset the TTL on subsequent hits within the window', async () => {
    redis.incr.mockResolvedValue(2);

    await guard.canActivate(makeContext(SESSION));

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('throws 429 once the count exceeds the configured max', async () => {
    redis.incr.mockResolvedValue(4);

    await expect(guard.canActivate(makeContext(SESSION))).rejects.toMatchObject(
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
      },
    );
    await expect(
      guard.canActivate(makeContext(SESSION)),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('scopes the rate-limit key by channelId + visitorFingerprint from the widget session', async () => {
    redis.incr.mockResolvedValue(1);

    await guard.canActivate(
      makeContext({
        ...SESSION,
        channelId: 'chan-2',
        visitorFingerprint: 'fp-2',
      }),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:chan-2:fp-2');
  });

  it('throws UnauthorizedException when widgetSession is missing (WidgetSessionGuard did not run)', async () => {
    await expect(guard.canActivate(makeContext(undefined))).rejects.toThrow(
      'widget session inválida o expirada',
    );
    expect(redis.incr).not.toHaveBeenCalled();
  });
});
