import { PlanModule } from './plan-module.entity';
import { ModuleAccessLevel } from '../enums/module-access-level.enum';
import { Plan } from './plan.entity';

describe('PlanModule Entity', () => {
  it('should create a PlanModule instance with default values', () => {
    const planModule = new PlanModule();
    planModule.menuKey = 'crm_contacts';
    planModule.accessLevel = ModuleAccessLevel.LOCKED;

    expect(planModule).toBeDefined();
    expect(planModule.menuKey).toBe('crm_contacts');
    expect(planModule.accessLevel).toBe(ModuleAccessLevel.LOCKED);
  });

  it('should link correctly to a Plan entity', () => {
    const plan = new Plan();
    plan.id = 'plan-uuid-123';
    plan.name = 'BrandStart';

    const planModule = new PlanModule();
    planModule.menuKey = 'dashboard';
    planModule.accessLevel = ModuleAccessLevel.FULL;
    planModule.plan = plan;

    expect(planModule.plan).toBeDefined();
    expect(planModule.plan.id).toBe('plan-uuid-123');
    expect(planModule.plan.name).toBe('BrandStart');
  });
});
