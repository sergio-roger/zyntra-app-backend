import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatRateLimitGuard } from '../guards/chat-rate-limit.guard';

const makeRedis = () => ({
  incr: jest.fn(),
  expire: jest.fn(),
});

const makeConfig = (overrides: Record<string, number> = {}) =>
  ({
    get: (key: string, fallback: number) => overrides[key] ?? fallback,
  }) as unknown as ConfigService;

function makeContext(body: unknown, headers: Record<string, unknown> = {}) {
  const req = { body, headers };
  return {
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

describe('ChatRateLimitGuard', () => {
  let redis: ReturnType<typeof makeRedis>;
  let guard: ChatRateLimitGuard;

  beforeEach(() => {
    redis = makeRedis();
    guard = new ChatRateLimitGuard(
      redis as any,
      makeConfig({ CHAT_RATE_LIMIT_MAX: 3, CHAT_RATE_LIMIT_WINDOW_SEC: 60 }),
    );
  });

  it('allows the request while under the limit', async () => {
    redis.incr.mockResolvedValue(1);

    const allowed = await guard.canActivate(
      makeContext({ channel_id: 'chan-1', visitor: { fingerprint: 'fp-1' } }),
    );

    expect(allowed).toBe(true);
    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:chan-1:fp-1');
    expect(redis.expire).toHaveBeenCalledWith('ratelimit:chat:chan-1:fp-1', 60);
  });

  it('does not reset the TTL on subsequent hits within the window', async () => {
    redis.incr.mockResolvedValue(2);

    await guard.canActivate(
      makeContext({ channel_id: 'chan-1', visitor: { fingerprint: 'fp-1' } }),
    );

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('throws 429 once the count exceeds the configured max', async () => {
    redis.incr.mockResolvedValue(4);

    await expect(
      guard.canActivate(
        makeContext({
          channel_id: 'chan-1',
          visitor: { fingerprint: 'fp-1' },
        }),
      ),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(
      guard.canActivate(
        makeContext({ channel_id: 'chan-1', visitor: { fingerprint: 'fp-1' } }),
      ),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('scopes the key by channel_id when present, ignoring business_id', async () => {
    redis.incr.mockResolvedValue(1);

    await guard.canActivate(
      makeContext({
        channel_id: 'chan-1',
        business_id: 'biz-1',
        visitor: { fingerprint: 'fp-1' },
      }),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:chan-1:fp-1');
  });

  it('falls back to business_id when channel_id is absent', async () => {
    redis.incr.mockResolvedValue(1);

    await guard.canActivate(
      makeContext({ business_id: 'biz-1', visitor: { fingerprint: 'fp-1' } }),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:biz-1:fp-1');
  });

  it('falls back to x-forwarded-for when no visitor fingerprint is sent', async () => {
    redis.incr.mockResolvedValue(1);

    await guard.canActivate(
      makeContext(
        { business_id: 'biz-1' },
        { 'x-forwarded-for': '203.0.113.9' },
      ),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:chat:biz-1:203.0.113.9');
  });

  it('allows the request without touching Redis when neither channel_id nor business_id is present', async () => {
    const allowed = await guard.canActivate(makeContext({}));

    expect(allowed).toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });
});
