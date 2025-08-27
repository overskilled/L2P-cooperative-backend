import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    limit: number;


}

export class PaginatedResponse<T> {
    data: T[];
    currentPage: number;
    totalPages: number;
    remainingPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasMore: boolean;
    sort: any;

    constructor(data: T[], total: number, dto: PaginationDto) {
        const page = dto.page || 1;
        const limit = dto.limit || 10;

        this.data = data;
        this.currentPage = page;
        this.itemsPerPage = limit;
        this.totalItems = total;

        // Calculate total pages
        this.totalPages = Math.ceil(total / limit);

        // Calculate remaining pages
        this.remainingPages = Math.max(this.totalPages - page, 0);

        // Do we have more pages?
        this.hasMore = page < this.totalPages;
    }
}