/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Phase 3 unit tests — AgentsService.
 * Run: npx jest agents-phase3
 */
import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ObjectLiteral, Repository } from 'typeorm';

import { AgentsService } from '../agents.service';
import { Agent, AgentTool } from '../entities/agent.entity';
import { Channel } from '@/modules/channels/entities/channel.entity';
import { AiService } from '@/modules/ai/ai.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeRepo = <T extends ObjectLiteral>() =>
  ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v: unknown) => v as T),
    remove: jest.fn(),
  }) as unknown as Repository<T>;

const makeAgent = (overrides: Partial<Agent> = {}): Agent => ({
  id: 'agent-1',
  business_id: 'biz-1',
  name: 'Test Agent',
  model: 'openai/gpt-4o-mini',
  system_prompt: 'You are helpful.',
  temperature: 0.7,
  tools: [],
  is_active: true,
  created_at: new Date(),
  updated_at: new Date(),
  business: {} as any,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------
describe('AgentsService', () => {
  let service: AgentsService;
  let agentRepo: Repository<Agent>;
  let channelRepo: Repository<Channel>;
  let aiService: Partial<AiService>;

  beforeEach(async () => {
    agentRepo = makeRepo<Agent>();
    channelRepo = makeRepo<Channel>();
    aiService = {
      chat: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentsService,
        { provide: getRepositoryToken(Agent), useValue: agentRepo },
        { provide: getRepositoryToken(Channel), useValue: channelRepo },
        { provide: AiService, useValue: aiService },
      ],
    }).compile();

    service = module.get<AgentsService>(AgentsService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // create()
  // -------------------------------------------------------------------------
  describe('create()', () => {
    it('creates an agent with defaults', async () => {
      const saved = makeAgent();
      (agentRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create('biz-1', {
        name: 'Test Agent',
        system_prompt: 'Be helpful.',
      });

      expect(result).toMatchObject({ name: 'Test Agent' });
      expect(agentRepo.save).toHaveBeenCalled();
    });

    it('stores provided tools array', async () => {
      const saved = makeAgent({ tools: [AgentTool.WEB_SEARCH] });
      (agentRepo.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.create('biz-1', {
        name: 'Agent',
        system_prompt: 'p',
        tools: [AgentTool.WEB_SEARCH],
      });

      expect(result.tools).toContain(AgentTool.WEB_SEARCH);
    });
  });

  // -------------------------------------------------------------------------
  // findOne()
  // -------------------------------------------------------------------------
  describe('findOne()', () => {
    it('returns agent when found', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(makeAgent());
      const result = await service.findOne('biz-1', 'agent-1');
      expect(result.id).toBe('agent-1');
    });

    it('throws NotFoundException when not found', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne('biz-1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // update()
  // -------------------------------------------------------------------------
  describe('update()', () => {
    it('updates name and temperature', async () => {
      const agent = makeAgent();
      (agentRepo.findOne as jest.Mock).mockResolvedValue(agent);
      (agentRepo.save as jest.Mock).mockResolvedValue({
        ...agent,
        name: 'Nuevo',
        temperature: 0.3,
      });

      const result = await service.update('biz-1', 'agent-1', {
        name: 'Nuevo',
        temperature: 0.3,
      });

      expect(result.name).toBe('Nuevo');
      expect(result.temperature).toBe(0.3);
    });
  });

  // -------------------------------------------------------------------------
  // remove()
  // -------------------------------------------------------------------------
  describe('remove()', () => {
    it('removes an unassigned agent', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(makeAgent());
      (channelRepo.findOne as jest.Mock).mockResolvedValue(null); // not assigned
      (agentRepo.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await service.remove('biz-1', 'agent-1');
      expect(result).toEqual({ success: true });
    });

    it('throws ConflictException when agent is assigned to an active channel', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(makeAgent());
      (channelRepo.findOne as jest.Mock).mockResolvedValue({
        id: 'chan-1',
        agent_id: 'agent-1',
      }); // assigned!

      await expect(service.remove('biz-1', 'agent-1')).rejects.toThrow(
        ConflictException,
      );
      expect(agentRepo.remove).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // sandboxTest()
  // -------------------------------------------------------------------------
  describe('sandboxTest()', () => {
    it('calls AiService with agent system_prompt and returns reply', async () => {
      const agent = makeAgent({ system_prompt: 'You sell things.' });
      (agentRepo.findOne as jest.Mock).mockResolvedValue(agent);
      (aiService.chat as jest.Mock).mockResolvedValue({
        model: 'openai/gpt-4o-mini',
        choices: [{ message: { content: 'Respuesta del agente' } }],
        usage: { total_tokens: 42 },
      });

      const result = await service.sandboxTest('biz-1', 'agent-1', '¿Hola?');

      expect(aiService.chat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            { role: 'system', content: 'You sell things.' },
            { role: 'user', content: '¿Hola?' },
          ]),
        }),
      );
      expect(result.reply).toBe('Respuesta del agente');
      expect(result.tokens).toBe(42);
    });

    it('returns fallback reply when model returns empty choices', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(makeAgent());
      (aiService.chat as jest.Mock).mockResolvedValue({
        model: 'openai/gpt-4o-mini',
        choices: [{ message: { content: null } }],
      });

      const result = await service.sandboxTest('biz-1', 'agent-1', 'test');
      expect(result.reply).toBe('Sin respuesta del modelo');
    });

    it('throws NotFoundException when agent not found', async () => {
      (agentRepo.findOne as jest.Mock).mockResolvedValue(null);
      await expect(
        service.sandboxTest('biz-1', 'missing', 'hi'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // -------------------------------------------------------------------------
  // assertOwnership()
  // -------------------------------------------------------------------------
  describe('assertOwnership()', () => {
    it('throws ForbiddenException when businessIds differ', () => {
      expect(() => service.assertOwnership('biz-A', 'biz-B')).toThrow(
        ForbiddenException,
      );
    });

    it('passes when businessIds match', () => {
      expect(() => service.assertOwnership('biz-A', 'biz-A')).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Multi-tenant: Business A cannot access Business B agents
  // -------------------------------------------------------------------------
  describe('multi-tenant isolation', () => {
    it('findOne throws NotFoundException for agent of another business', async () => {
      // Simulate DB returning null because business_id filter excludes the row
      (agentRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.findOne('biz-B', 'agent-of-biz-A')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('assertOwnership blocks cross-business requests at controller boundary', () => {
      // User logged in as biz-A tries to reach biz-B route param
      expect(() => service.assertOwnership('biz-A', 'biz-B')).toThrow(
        ForbiddenException,
      );
    });
  });
});
