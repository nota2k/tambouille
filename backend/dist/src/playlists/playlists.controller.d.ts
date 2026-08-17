import { PlaylistsService } from './playlists.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';
import { AddMixDto } from './dto/add-mix.dto';
import { MyPlaylistsDto } from './dto/my-playlists.dto';
export declare class PlaylistsController {
    private readonly playlistsService;
    constructor(playlistsService: PlaylistsService);
    listMine(userId: string, query: MyPlaylistsDto): Promise<any[]>;
    findOne(id: string, currentUserId?: string): Promise<any>;
    create(userId: string, dto: CreatePlaylistDto): Promise<any>;
    update(id: string, userId: string, dto: UpdatePlaylistDto): Promise<any>;
    remove(id: string, userId: string): Promise<void>;
    addMix(id: string, userId: string, dto: AddMixDto): Promise<void>;
    removeMix(id: string, mixId: string, userId: string): Promise<void>;
}
