import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { QueryPlaylistsDto } from './dto/query-playlists.dto';
export declare class PlaylistsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(userId: string, dto: CreatePlaylistDto): Promise<any>;
    listMine(userId: string, mixId?: string): Promise<any[]>;
    findOne(id: string, currentUserId?: string): Promise<any>;
    listByUsername(username: string, query: QueryPlaylistsDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    update(id: string, userId: string, dto: UpdatePlaylistDto): Promise<any>;
    remove(id: string, userId: string): Promise<void>;
    addMix(playlistId: string, userId: string, mixId: string): Promise<void>;
    removeMix(playlistId: string, userId: string, mixId: string): Promise<void>;
    private assertOwnership;
}
