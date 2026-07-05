import { CreateChannelDto } from '@/modules/channels/dto/create-channel.dto';
import { UpdateChannelDto } from '@/modules/channels/dto/update-channel.dto';
import { ChannelCredential } from '@/modules/channels/entities/channel-credential.entity';
import { ChannelType } from '@/modules/channels/entities/channel-type.entity';
import {
  Channel,
  ChannelStatus,
} from '@/modules/channels/entities/channel.entity';
import { ChannelProviderFactory } from '@/modules/channels/providers/channel-provider.factory';
import { buildEmbedSnippet } from '@/modules/channels/utils/embed-snippet.util';
import { encryptCredentials } from '@/modules/channels/utils/crypto.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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

  async getStore() {
    return this.channelTypeRepo.find({
      order: { sort_order: 'ASC' },
      select: [
        'id',
        'key',
        'label',
        'description',
        'icon_url',
        'is_available',
        'config_schema',
        'sort_order',
      ],
    });
  }

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
      const provider = this.providerFactory.getProvider(
        channel.channelType.key,
      );
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

  async assignAgent(businessId: string, channelId: string, agentId: string) {
    const channel = await this.findOne(businessId, channelId);

    channel.agent_id = agentId;
    return this.channelRepo.save(channel);
  }

  async unassignAgent(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);
    channel.agent_id = null;
    return this.channelRepo.save(channel);
  }

  async getEmbedSnippet(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);

    if (channel.channelType.key !== 'web_chat') {
      throw new BadRequestException(
        'El snippet de embed solo aplica a canales de tipo web_chat',
      );
    }

    const snippet = buildEmbedSnippet({
      channelId: channel.id,
      businessId: channel.business_id,
    });

    return {
      channel_id: channel.id,
      business_id: channel.business_id,
      snippet,
    };
  }

  async findAllByBusiness(businessId: string): Promise<Channel[]> {
    return this.channelRepo.find({
      where: { business_id: businessId, channelType: { key: 'web_chat' } },
      relations: ['channelType'],
      order: { created_at: 'DESC' },
    });
  }

  async findByChannelId(channelId: string): Promise<Channel | null> {
    return this.channelRepo.findOne({
      where: { id: channelId, channelType: { key: 'web_chat' } },
      relations: ['channelType'],
    });
  }

  assertOwnership(requestBusinessId: string, paramBusinessId: string) {
    if (requestBusinessId !== paramBusinessId) {
      throw new ForbiddenException('No tienes acceso a este recurso');
    }
  }
}
