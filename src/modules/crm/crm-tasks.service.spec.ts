import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CrmTasksService } from './crm-tasks.service';
import { CrmTask } from './entities/task.entity';
import { Business } from '@auth/entities/business.entity';
import { UserRole } from '@crm/enums/user-role.enum';
import { TaskStatus } from '@crm/enums/task-status.enum';
import { ContactsService } from './contacts.service';

const mockBusiness = { id: 'biz-uuid' } as Business;

const makeTask = (assignedTo: string | null = null): CrmTask =>
  ({
    id: 'task-uuid',
    business_id: 'biz-uuid',
    title: 'Test task',
    status: TaskStatus.PENDING,
    assigned_to: assignedTo,
    contact_id: null,
    due_date: new Date(),
  }) as unknown as CrmTask;

describe('CrmTasksService — ownership rules', () => {
  let service: CrmTasksService;

  const tasksRepo = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softRemove: jest.fn(),
  };

  const contactsService = { addActivity: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmTasksService,
        { provide: getRepositoryToken(CrmTask), useValue: tasksRepo },
        { provide: ContactsService, useValue: contactsService },
      ],
    }).compile();

    service = module.get<CrmTasksService>(CrmTasksService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('update() ownership', () => {
    it('ADMIN can update any task', async () => {
      const task = makeTask('other-user-uuid');
      tasksRepo.findOne.mockResolvedValue(task);
      tasksRepo.save.mockResolvedValue(task);

      await expect(
        service.update(
          mockBusiness,
          'task-uuid',
          { title: 'Updated' },
          {
            id: 'admin-uuid',
            role: UserRole.ADMIN,
          },
        ),
      ).resolves.toBeDefined();
    });

    it('MANAGER can update any task', async () => {
      const task = makeTask('other-user-uuid');
      tasksRepo.findOne.mockResolvedValue(task);
      tasksRepo.save.mockResolvedValue(task);

      await expect(
        service.update(
          mockBusiness,
          'task-uuid',
          { title: 'Updated' },
          {
            id: 'manager-uuid',
            role: UserRole.MANAGER,
          },
        ),
      ).resolves.toBeDefined();
    });

    it('AGENT can update their own task', async () => {
      const task = makeTask('agent-uuid');
      tasksRepo.findOne.mockResolvedValue(task);
      tasksRepo.save.mockResolvedValue(task);

      await expect(
        service.update(
          mockBusiness,
          'task-uuid',
          { title: 'Updated' },
          {
            id: 'agent-uuid',
            role: UserRole.AGENT,
          },
        ),
      ).resolves.toBeDefined();
    });

    it('AGENT cannot update a task assigned to someone else', async () => {
      const task = makeTask('other-user-uuid');
      tasksRepo.findOne.mockResolvedValue(task);

      await expect(
        service.update(
          mockBusiness,
          'task-uuid',
          { title: 'Hijack' },
          {
            id: 'agent-uuid',
            role: UserRole.AGENT,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when task does not exist', async () => {
      tasksRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(
          mockBusiness,
          'no-such-uuid',
          {},
          {
            id: 'admin-uuid',
            role: UserRole.ADMIN,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('list() ownership', () => {
    const mockQb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    beforeEach(() => {
      tasksRepo.createQueryBuilder.mockReturnValue(mockQb);
    });

    it('ADMIN gets all tasks (no assigned_to filter)', async () => {
      await service.list(
        mockBusiness,
        {},
        { id: 'admin-uuid', role: UserRole.ADMIN },
      );
      expect(mockQb.andWhere).not.toHaveBeenCalledWith(
        expect.stringContaining('assigned_to'),
        expect.anything(),
      );
    });

    it('AGENT gets only their own tasks (assigned_to filter applied)', async () => {
      await service.list(
        mockBusiness,
        {},
        { id: 'agent-uuid', role: UserRole.AGENT },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith('t.assigned_to = :uid', {
        uid: 'agent-uuid',
      });
    });
  });

  describe('remove() — soft-delete rule', () => {
    it('calls softRemove — not hard remove', async () => {
      const task = makeTask('agent-uuid');
      tasksRepo.findOne.mockResolvedValue(task);
      tasksRepo.softRemove.mockResolvedValue({
        ...task,
        deleted_at: new Date(),
      });

      await service.remove(mockBusiness, 'task-uuid');

      expect(tasksRepo.softRemove).toHaveBeenCalledWith(task);
      expect(tasksRepo.softRemove).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundException when task does not exist', async () => {
      tasksRepo.findOne.mockResolvedValue(null);

      await expect(
        service.remove(mockBusiness, 'no-such-uuid'),
      ).rejects.toThrow(NotFoundException);

      expect(tasksRepo.softRemove).not.toHaveBeenCalled();
    });
  });
});
