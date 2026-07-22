import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { OrchestratorController } from './orchestrator.controller';
import { OrchestratorService } from './orchestrator.service';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

const makeReq = (businessId: string) =>
  ({ user: { businessId } }) as RequestWithUser;

describe('OrchestratorController — ownership rules', () => {
  let controller: OrchestratorController;

  const service = { enqueueRun: jest.fn(), findOneForBusiness: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrchestratorController],
      providers: [{ provide: OrchestratorService, useValue: service }],
    }).compile();

    controller = module.get<OrchestratorController>(OrchestratorController);
  });

  afterEach(() => jest.clearAllMocks());

  it('create() rechaza cuando el businessId del path no coincide con el del JWT', () => {
    const req = makeReq('biz-A');
    expect(() =>
      controller.create(req, 'biz-B', { goal: 'x' }),
    ).toThrow(ForbiddenException);
    expect(service.enqueueRun).not.toHaveBeenCalled();
  });

  it('create() delega en el service cuando el businessId coincide', async () => {
    const req = makeReq('biz-A');
    service.enqueueRun.mockResolvedValue({ id: 'run-1' });

    await controller.create(req, 'biz-A', { goal: 'lanzar campaña' });

    expect(service.enqueueRun).toHaveBeenCalledWith('biz-A', 'lanzar campaña');
  });

  it('findOne() rechaza cuando el businessId del path no coincide con el del JWT', () => {
    const req = makeReq('biz-A');
    expect(() =>
      controller.findOne(req, 'biz-B', 'run-1'),
    ).toThrow(ForbiddenException);
    expect(service.findOneForBusiness).not.toHaveBeenCalled();
  });
});
