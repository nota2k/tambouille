import type { Request } from 'express';
import { MixesService } from './mixes.service';
import { CoverImportService } from './cover-import.service';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';
import { QuerySuggestionsDto } from './dto/query-suggestions.dto';
import { type UploadedFile as R2File } from '../common/upload.utils';
type UploadedFilesShape = {
    audio?: R2File[];
    cover?: R2File[];
};
export declare class MixesController {
    private readonly mixesService;
    private readonly coverImportService;
    constructor(mixesService: MixesService, coverImportService: CoverImportService);
    findAll(query: QueryMixesDto, currentUserId?: string): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listFavorites(userId: string, query: QueryMixesDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listRecentlyPlayed(userId: string, query: QueryMixesDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listFollowingFeed(userId: string, query: QueryMixesDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findAllTags(): Promise<string[]>;
    findOne(id: string, currentUserId?: string): Promise<any>;
    resolveAudio(id: string, request: Request): Promise<{
        url: string;
        statusCode: number;
    }>;
    listSuggestions(id: string, query: QuerySuggestionsDto, currentUserId?: string): Promise<{
        items: any[];
    }>;
    registerPlay(id: string, currentUserId?: string): Promise<void>;
    addFavorite(id: string, userId: string): Promise<void>;
    removeFavorite(id: string, userId: string): Promise<void>;
    create(userId: string, dto: CreateMixDto, files: UploadedFilesShape): Promise<any>;
    update(id: string, userId: string, dto: UpdateMixDto, file?: R2File): Promise<any>;
    remove(id: string, userId: string): Promise<void>;
}
export {};
