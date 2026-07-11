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
import { isOriginAllowed } from '@/modules/channels/utils/origin.util';
import { generatePublicKey } from '@/modules/channels/utils/public-key.util';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';

/**
 * Projects the widget domain-security fields the wizard writes to
 * `config.{allowedDomains,blockedDomains,allowInsecureDomains}` onto the
 * dedicated `channels` columns that `validateOriginAndGetChannel()` actually
 * enforces against Origin/Referer.
 */
function originColumnsFromConfig(config: Record<string, unknown>) {
  return {
    allowedOrigins: Array.isArray(config.allowedDomains)
      ? (config.allowedDomains as string[])
      : [],
    blockedOrigins: Array.isArray(config.blockedDomains)
      ? (config.blockedDomains as string[])
      : [],
    allowInsecureOrigins: config.allowInsecureDomains === true,
  };
}

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);

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
      businessId: businessId,
      channelTypeId: channelType.id,
      name: dto.name,
      status: ChannelStatus.ACTIVE,
      agentId: null,
      config,
      publicKey: channelType.key === 'web_chat' ? generatePublicKey() : null,
      ...originColumnsFromConfig(config),
    });
    await this.channelRepo.save(channel);

    const setupResult = await provider.setup(
      channel.id,
      businessId,
      config,
      channel.publicKey ?? undefined,
    );

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
      where: { businessId: businessId },
      relations: ['channelType'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(businessId: string, channelId: string) {
    const channel = await this.channelRepo.findOne({
      where: { id: channelId, businessId: businessId },
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
      Object.assign(channel, originColumnsFromConfig(dto.config));
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

    channel.agentId = agentId;
    return this.channelRepo.save(channel);
  }

  async unassignAgent(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);
    channel.agentId = null;
    return this.channelRepo.save(channel);
  }

  async getEmbedSnippet(businessId: string, channelId: string) {
    const channel = await this.findOne(businessId, channelId);

    if (channel.channelType.key !== 'web_chat') {
      throw new BadRequestException(
        'El snippet de embed solo aplica a canales de tipo web_chat',
      );
    }
    if (!channel.publicKey) {
      throw new BadRequestException('Este canal no tiene un public_key generado');
    }

    const snippet = buildEmbedSnippet({ publicKey: channel.publicKey });

    return {
      channel_id: channel.id,
      business_id: channel.businessId,
      snippet,
    };
  }

  async findAllByBusiness(businessId: string): Promise<Channel[]> {
    return this.channelRepo.find({
      where: { businessId: businessId, channelType: { key: 'web_chat' } },
      relations: ['channelType'],
      order: { createdAt: 'DESC' },
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

  // ---------------------------------------------------------------------------
  // Widget public_key exchange support
  // ---------------------------------------------------------------------------

  /** Revokes the current public_key and generates a fresh one, in one write. */
  async rotatePublicKey(businessId: string, channelId: string): Promise<string> {
    const channel = await this.findOne(businessId, channelId);
    if (channel.channelType.key !== 'web_chat') {
      throw new BadRequestException(
        'public_key solo aplica a canales de tipo web_chat',
      );
    }

    channel.publicKey = generatePublicKey();
    channel.publicKeyRevokedAt = null;
    await this.channelRepo.save(channel);
    return channel.publicKey;
  }

  /**
   * Resolves a channel from its public_key and enforces allowed_origins.
   * Used by the widget's public_key -> session JWT exchange.
   */
  async validateOriginAndGetChannel(
    publicKey: string,
    origin?: string,
    referer?: string,
  ): Promise<Channel> {
    const channel = await this.channelRepo.findOne({
      where: { publicKey: publicKey, publicKeyRevokedAt: IsNull() },
      relations: ['channelType'],
    });
    if (!channel) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const allowedOrigins = channel.allowedOrigins ?? [];
    const blockedOrigins = channel.blockedOrigins ?? [];
    const allowInsecure = channel.allowInsecureOrigins === true;

    if (allowInsecure) {
      this.logger.warn(
        `channel_id=${channel.id} has allow_insecure_origins=true; ` +
          `allowing the public_key exchange from any origin`,
      );
    } else if (allowedOrigins.length === 0 && blockedOrigins.length === 0) {
      this.logger.warn(
        `channel_id=${channel.id} has no allowed_origins configured; ` +
          `allowing the public_key exchange from any origin`,
      );
    } else if (
      !isOriginAllowed(
        allowedOrigins,
        origin,
        referer,
        blockedOrigins,
        allowInsecure,
      )
    ) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    return channel;
  }
}
