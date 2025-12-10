import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Public } from '../../../auth/decorators/public.decorator';
import { MapRouterService } from '../../application/services/map-router.service';
import {
  SearchQueryDto,
  ManualPinDto,
  RouterResponseDto,
  SearchResultDto,
} from '../dto/map-router.dto';

/**
 * Map Router Controller
 * Handles intelligent location search routing using GPT-4.1 and Google Maps APIs
 */
@ApiTags('Map Router')
@Controller('map')
export class MapRouterController {
  private readonly logger = new Logger(MapRouterController.name);

  constructor(private readonly mapRouterService: MapRouterService) {}

  /**
   * Search for locations with intelligent routing
   */
  @Public()
  @Post('router')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Intelligent location search',
    description:
      'Uses GPT-4.1 to route queries to the appropriate Google Maps API (Places, Geocoding, etc.)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Search completed successfully',
    type: RouterResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid search query' })
  async search(@Body() searchQuery: SearchQueryDto): Promise<RouterResponseDto> {
    this.logger.log(`Received search request: "${searchQuery.query}"`);
    return await this.mapRouterService.search(searchQuery);
  }

  /**
   * Create a manual pin location
   */
  @Public()
  @Post('manual-pin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create manual pin',
    description:
      'Create a location by manually dropping a pin on the map when no search results are found',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Manual pin created successfully',
    type: SearchResultDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid pin data' })
  async createManualPin(@Body() pinData: ManualPinDto): Promise<SearchResultDto> {
    this.logger.log(
      `Creating manual pin: ${pinData.lat}, ${pinData.lng} - "${pinData.user_label}"`,
    );
    return await this.mapRouterService.createManualPin(pinData);
  }
}
