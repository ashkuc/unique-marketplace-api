import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

import { queryArray } from '../utils/decorators/query-array.decorator';
import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { parseCollectionIdRequest } from '../utils/parsers/parse-collection-id-request';
import { QueryParamArray } from '../utils/query-param-array';
import { OnHoldDto } from './on-hold-dto';
import { OnHoldService } from './on-hold.service';


@Controller('OnHold')
export class OnHoldController {
  constructor(private readonly onHoldService: OnHoldService) {}


  @ApiQuery(queryArray('collectionId', 'integer'))
  @Get()
  get(@Query() pagination: PaginationRequest, @Query('collectionId') collectionId?: QueryParamArray): Promise<PaginationResult<OnHoldDto>> {
    return this.onHoldService.get(parseCollectionIdRequest(collectionId), undefined, pagination);
  }

  @ApiQuery(queryArray('collectionId', 'integer'))
  @Get(':owner')
  getBySeller(@Param('owner') owner: string, @Query() pagination: PaginationRequest, @Query('collectionId') collectionId?: QueryParamArray): Promise<PaginationResult<OnHoldDto>> {
    return this.onHoldService.get(parseCollectionIdRequest(collectionId), owner, pagination);
  }
}
