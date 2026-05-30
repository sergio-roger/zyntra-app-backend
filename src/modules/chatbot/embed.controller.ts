import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '@common/interfaces/request-with-user.interface';

@ApiTags('Chat')
@Controller('chat')
export class EmbedController {
  @Get('embed-snippet')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get embed snippet for widget' })
  getEmbedSnippet(@Req() req: RequestWithUser) {
    const businessId = (req.user as { business_id?: string }).business_id;
    if (!businessId) {
      throw new Error('Business ID not found');
    }

    const snippet = `<script src="https://cdn.zyntra.app/widget/v1.js" data-business-id="${businessId}" defer></script>`;

    return {
      snippet,
      business_id: businessId,
      url: `https://cdn.zyntra.app/widget/v1.js`,
      docs: 'https://docs.zyntra.app/widget',
    };
  }
}
