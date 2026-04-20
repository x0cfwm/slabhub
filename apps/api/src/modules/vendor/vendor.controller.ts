import { Controller, Get, Param, Query } from '@nestjs/common';
import { VendorService } from './vendor.service';

@Controller('vendor')
export class VendorController {
    constructor(private readonly vendorService: VendorService) { }

    @Get()
    async listVendors(
        @Query('search') search?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
    ) {
        return this.vendorService.listVendors({
            search,
            page: page ? parseInt(page, 10) : 1,
            limit: limit ? parseInt(limit, 10) : 20,
        });
    }

    @Get(':handle')
    async getVendorPage(@Param('handle') handle: string) {
        return this.vendorService.getVendorPage(handle);
    }
}
