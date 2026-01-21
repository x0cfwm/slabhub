import { Controller, Get, Param } from '@nestjs/common';
import { VendorService } from './vendor.service';

@Controller('vendor')
export class VendorController {
    constructor(private readonly vendorService: VendorService) { }

    @Get(':handle')
    async getVendorPage(@Param('handle') handle: string) {
        return this.vendorService.getVendorPage(handle);
    }
}
