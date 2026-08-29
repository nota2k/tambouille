import { PrismaService } from '../prisma/prisma.service';
import { type MediaBases } from '../common/audio-source';
import { CreateMixDto } from './dto/create-mix.dto';
import { UpdateMixDto } from './dto/update-mix.dto';
import { QueryMixesDto } from './dto/query-mixes.dto';
import { CoverImportService } from './cover-import.service';
import type { MixImport } from '../imports/source-importer';
export declare function assertExactlyOneAudioSource(audioUrl: string | null, sourceType: string | null, sourceRef: string | null): void;
export declare function assertSourcePageHasASource(sourceRef: string | null, sourcePageUrl: string | null): void;
export declare function buildMixInclude(currentUserId?: string): {
    readonly include: {
        readonly favorites?: {
            where: {
                userId: string;
            };
            select: {
                id: boolean;
            };
        } | undefined;
        readonly user: {
            readonly select: {
                readonly id: true;
                readonly username: true;
                readonly displayName: true;
                readonly avatarUrl: true;
            };
        };
        readonly tracklist: {
            readonly orderBy: {
                readonly timecodeSec: "asc";
            };
        };
        readonly _count: {
            readonly select: {
                readonly favorites: true;
                readonly comments: true;
            };
        };
    };
};
export declare function toMixResponse(mix: any): any;
export declare class MixesService {
    private readonly prisma;
    private readonly coverImport;
    constructor(prisma: PrismaService, coverImport: CoverImportService);
    findAllTags(): Promise<string[]>;
    create(userId: string, dto: CreateMixDto, files: {
        audioUrl?: string;
        coverUrl?: string;
    }): Promise<any>;
    createFromImport(userId: string, imp: MixImport): Promise<any>;
    private slugLibrePour;
    findAll(query: QueryMixesDto, currentUserId?: string): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    findBySlug(username: string, slug: string, currentUserId?: string): Promise<any>;
    findBySource(ref?: string, pageUrl?: string): Promise<{
        id: string;
        coverUrl: string | null;
        createdAt: Date;
        title: string;
        slug: string;
        user: {
            username: string | null;
            displayName: string;
        };
    } | null>;
    findOne(id: string, currentUserId?: string): Promise<any>;
    resolveAudio(id: string, bases: MediaBases): Promise<{
        url: string;
        statusCode: number;
    }>;
    update(id: string, userId: string, dto: UpdateMixDto, coverUrl?: string): Promise<any>;
    remove(id: string, userId: string): Promise<void>;
    listSuggestions(id: string, limit: number, currentUserId?: string): Promise<{
        items: any[];
    }>;
    listByArtist(id: string, limit: number, currentUserId?: string): Promise<{
        items: any[];
    }>;
    registerPlay(id: string, userId?: string): Promise<void>;
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
    addFavorite(userId: string, mixId: string): Promise<void>;
    removeFavorite(userId: string, mixId: string): Promise<void>;
    listFavorites(userId: string, query: QueryMixesDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
