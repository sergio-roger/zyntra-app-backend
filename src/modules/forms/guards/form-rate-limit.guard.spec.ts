/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { FormRateLimitGuard } from './form-rate-limit.guard';

describe('FormRateLimitGuard', () => {
  let guard: FormRateLimitGuard;
  const redis = {
    incr: jest.fn(),
    expire: jest.fn(),
  };
  const config = new ConfigService({
    FORM_SUBMIT_RATE_LIMIT_MAX: 2,
    FORM_SUBMIT_RATE_LIMIT_WINDOW_SEC: 60,
  });

  const makeContext = (params: Record<string, string>): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ params, ip: '127.0.0.1' }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    guard = new FormRateLimitGuard(redis as any, config);
    jest.clearAllMocks();
  });

  it('allows the request and sets an expiry on the first hit', async () => {
    redis.incr.mockResolvedValue(1);

    const result = await guard.canActivate(
      makeContext({ businessId: 'biz-1', slug: 'contacto' }),
    );

    expect(result).toBe(true);
    expect(redis.incr).toHaveBeenCalledWith(
      'ratelimit:form-submit:biz-1:contacto:127.0.0.1',
    );
    expect(redis.expire).toHaveBeenCalledWith(
      'ratelimit:form-submit:biz-1:contacto:127.0.0.1',
      60,
    );
  });

  it('does not reset the expiry on subsequent hits within the window', async () => {
    redis.incr.mockResolvedValue(2);

    await guard.canActivate(
      makeContext({ businessId: 'biz-1', slug: 'contacto' }),
    );

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('throws 429 once the max is exceeded', async () => {
    redis.incr.mockResolvedValue(3);

    await expect(
      guard.canActivate(makeContext({ businessId: 'biz-1', slug: 'contacto' })),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    await expect(
      guard.canActivate(makeContext({ businessId: 'biz-1', slug: 'contacto' })),
    ).rejects.toBeInstanceOf(HttpException);
  });
});
