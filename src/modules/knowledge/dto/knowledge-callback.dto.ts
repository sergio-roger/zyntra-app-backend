import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { KnowledgeDocumentStatus } from '@/modules/agents/enums/knowledge-document-status.enum';

export class KnowledgeCallbackDto {
  @ApiProperty()
  @IsUUID()
  documentId: string;

  @ApiProperty({
    enum: [KnowledgeDocumentStatus.READY, KnowledgeDocumentStatus.FAILED],
  })
  @IsEnum(KnowledgeDocumentStatus)
  status: KnowledgeDocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  chunkCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  tokenCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  errorMessage?: string;
}
