import { SegmentCondition } from '@crm/entities/segment.entity';

export interface SegmentResponse {
  conditions: SegmentCondition[];
  createdAt: Date;
  description: string | null;
  id: string;
  name: string;
  type: string;
  updatedAt: Date;
}
