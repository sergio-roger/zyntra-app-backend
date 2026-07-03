import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { ChannelType } from './entities/channel-type.entity';
import { Channel, ChannelStatus } from './entities/channel.entity';
import { ChannelCredential } from './entities/channel-credential.entity';
import { ChannelProviderFactory } from './providers/channel-provider.factory';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

// AES-256-GCM helpers ---------------------------------------------------------
const ALGO = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.CHANNEL_CREDENTIALS_KEY;
  if (!raw) throw new Error('CHANNEL_CREDENTIALS_KEY env var not set');
  const key = Buffer.from(raw, 'hex');
  if (key.length !== 32) throw new Error('CHANNEL_CREDENTIALS_KEY must be 32 bytes (64 hex chars)');
  return key;
}

export function encryptCredentials(data: Record<string, unknown>): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const plain = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptCredentials(encoded: string): Record<string, unknown> {
  const key = getKey();
  const [ivHex, tagHex, ctHex] = encoded.split(':');
  if (!ivHex || !tagHex || !ctHex) throw new Error('Invalid credential format');
  const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ctHex, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
}

// -----------------------------------------------------------------------------

@Injectable()
export class ChannelsService {
  constructor(
    @InjectRepository(ChannelType)
    private readonly channelTypeRepo: Repository<ChannelType>,

    @InjectRepository(Channel)
    private readonly channelRepo: Repository<Channel>,

    @InjectRepository(ChannelCredential)
    private readonly credentialRepo: Repository<ChannelCredential>,

    private readonly providerFactory: ChannelProviderFactory,
  ) {}

  // ---------------------------------------------------------------------------
  // Channel Store
  // ---------------------------------------------------------------------------
  async getStore() {
    return this.channelTypeRepo.find({
      order: { sort_order: 'ASC' },
      select: ['id', 'key', 'label', 'description', 'icon_url', 'is_available', 'config_schema', 'sort_order'],
    });
  }

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------
  async create(businessId: string, dto: CreateChannelDto) {
    const channelType = await this.channelTypeRepo.findOne({
      where: { id: dto.channelTypeId },
    });
    if (!channelType) {
      throw new NotFoundException('Tipo de canal no encontrado');
    }
    if (!channelType.is_available) {
      throw new BadRequestException('Este canal aún no está disponible');
    }

    const config = dto.config ?? {};
    const provider = this.providerFactory.getProvider(channelType.key);
    provider.validateConfig(config);

    const channel = this.channelRepo.create({
      business_id: businessId,
      channel_type_id: channelType.id,
      name: dto.name,
      status: ChannelStatus.ACTIVE,
      agent_id: null,
      config,
    });
    await this.channelRepo.save(channel);

    const setupResult = await provider.setup(channel.id, businessId, config);

    // Update config with whatever setup returned (e.g. embedCode baked in)
    channel.config = setupResult.config;
    await this.channelRepo.save(channel);

    // Persist (empty) credentials record — actual secrets added on activation
    const credData = encryptCredentials({});
    const cred = this.credentialRepo.create({
      channel_id: channel.id,
      data: credData,
    });
    await this.credentialRepo.save(cred);

    return {
      ...channel,
      channelType,
      embedCode: setupResult.embedCode,
    };
  }

  async findAll(businessId: string) {
    return this.channelRepo.find({
      where: { business_id: businessId },
      relations: ['channelType'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(businessId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, business_id: businessId },
      relations: ['channelType'],
    });
    if (!channel) throw new NotFoundException('Canal no encontrado');
    return channel;
  }

  async update(businessId: string, channelId: string, dto: UpdateChannelDto) {
    const channel = await this.findOne(businessId, channelId);

    if (dto.name !== undefined) channel.name = dto.name;
    if (dto.status !== undefined) channel.status = dto.status;
    if (dto.config !== undefined) {
      const provider = this.providerFactory.getProvider(channel.channelType.key);
      provider.validateConfig(dto.config);
      channel.config = dto.config;
    }

    return this.channelRepo.save(channel);
  }

  async remove(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);
    await this.channelRepo.remove(channel);
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Ownership guard helper (used by controller)
  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Agent assignment
  // ---------------------------------------------------------------------------
  async assignAgent(businessId: string, channelId: string, agentId: string) {
    const channel = await this.findOne(businessId, channelId);

    // Verify agent belongs to the same business (done via agentRepo query)
    // We only have access to channelRepo here — the AgentsService owns the Agent repo.
    // We delegate ownership validation to the caller (AgentsService.findOne throws if not found).
    channel.agent_id = agentId;
    return this.channelRepo.save(channel);
  }

  async unassignAgent(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);
    channel.agent_id = null;
    return this.channelRepo.save(channel);
  }

  async findByBusinessAndType(businessId: string, typeKey: string): Promise<Channel | null> {
    return this.channelRepo.findOne({
      where: { business_id: businessId, channelType: { key: typeKey } },
      relations: ['channelType'],
    });
  }

  assertOwnership(requestBusinessId: string, paramBusinessId: string) {
    if (requestBusinessId !== paramBusinessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }
}
