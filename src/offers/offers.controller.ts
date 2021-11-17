import { Controller, Get, Query } from '@nestjs/common';

import { PaginationRequest } from '../utils/pagination/pagination-request';
import { PaginationResult } from '../utils/pagination/pagination-result';
import { SortingRequest } from '../utils/sorting/sorting-request';
import { OfferDto } from './offer-dto';
import { OffersFilter } from './offers-filter';
import { ParseOffersFilterPipe } from './offers-filter.pipe';
import { OffersService } from './offers.service';

@Controller('Offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get()
  get(@Query() pagination: PaginationRequest, @Query(ParseOffersFilterPipe) offersFilter: OffersFilter, @Query() sort: SortingRequest): Promise<PaginationResult<OfferDto>> {
    return this.offersService.get(pagination, offersFilter, sort);
  }
}
