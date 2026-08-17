import { UsersService } from './users.service';
import { PlaylistsService } from '../playlists/playlists.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from './dto/pagination.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { type UploadedFile as R2File } from '../common/upload.utils';
export declare class UsersController {
    private readonly usersService;
    private readonly playlistsService;
    constructor(usersService: UsersService, playlistsService: PlaylistsService);
    searchUsers(query: SearchUsersDto): Promise<{
        items: {
            id: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
        }[];
    }>;
    getProfile(username: string, currentUserId?: string): Promise<{
        id: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        createdAt: Date;
        mixesCount: number;
        followersCount: number;
        followingCount: number;
        isFollowing: boolean;
    }>;
    listFollowers(username: string, query: PaginationDto): Promise<{
        items: {
            id: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listFollowing(username: string, query: PaginationDto): Promise<{
        items: {
            id: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    listPlaylists(username: string, query: PaginationDto): Promise<{
        items: any[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    follow(username: string, userId: string): Promise<void>;
    unfollow(username: string, userId: string): Promise<void>;
    updateProfile(userId: string, dto: UpdateProfileDto): Promise<{
        id: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        createdAt: Date;
        mixesCount: number;
        followersCount: number;
        followingCount: number;
        isFollowing: boolean;
    }>;
    deleteAccount(userId: string): Promise<void>;
    uploadAvatar(userId: string, file?: R2File): Promise<{
        id: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        createdAt: Date;
        mixesCount: number;
        followersCount: number;
        followingCount: number;
        isFollowing: boolean;
    }>;
    uploadCover(userId: string, file?: R2File): Promise<{
        id: string;
        username: string | null;
        displayName: string;
        bio: string | null;
        avatarUrl: string | null;
        coverUrl: string | null;
        createdAt: Date;
        mixesCount: number;
        followersCount: number;
        followingCount: number;
        isFollowing: boolean;
    }>;
}
