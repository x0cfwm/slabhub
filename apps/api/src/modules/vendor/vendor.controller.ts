import { Controller, Get, Param, Query } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { CurrentUserId } from '../auth/auth.middleware';

@Controller('vendor')
export class VendorController {
    constructor(private readonly vendorService: VendorService) { }

    @Get()
    async listVendors(
        @CurrentUserId() viewerUserId: string | undefined,
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.vendorService.listVendors({
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
            viewerUserId,
        });
    }

    @Get(':handle')
    async getVendorPage(
        @Param('handle') handle: string,
        @CurrentUserId() viewerUserId: string | undefined,
    ) {
        return this.vendorService.getVendorPage(handle, viewerUserId);
    }
}
