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
        this.data = data;
        this.currentPage = dto.page;
        this.totalItems = total;
        this.itemsPerPage = dto.limit;
        this.totalPages = Math.ceil(total / dto.limit);
        this.remainingPages = Math.max(this.totalPages - dto.page, 0);
        this.hasMore = dto.page < this.totalPages;
        this.sort = dto.page < this.totalPages;
    }
}