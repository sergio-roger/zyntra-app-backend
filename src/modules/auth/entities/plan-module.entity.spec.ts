import { PlanModule, ModuleAccessLevel } from './plan-module.entity';
import { Plan } from './plan.entity';

describe('PlanModule Entity', () => {
  it('should create a PlanModule instance with default values', () => {
    const planModule = new PlanModule();
    planModule.menu_key = 'crm_contacts';
    planModule.access_level = ModuleAccessLevel.LOCKED;

    expect(planModule).toBeDefined();
    expect(planModule.menu_key).toBe('crm_contacts');
    expect(planModule.access_level).toBe(ModuleAccessLevel.LOCKED);
  });

  it('should link correctly to a Plan entity', () => {
    const plan = new Plan();
    plan.id = 'plan-uuid-123';
    plan.name = 'BrandStart';

    const planModule = new PlanModule();
    planModule.menu_key = 'dashboard';
    planModule.access_level = ModuleAccessLevel.FULL;
    planModule.plan = plan;

    expect(planModule.plan).toBeDefined();
    expect(planModule.plan.id).toBe('plan-uuid-123');
    expect(planModule.plan.name).toBe('BrandStart');
  });
});
