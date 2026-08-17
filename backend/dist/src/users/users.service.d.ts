import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from './dto/pagination.dto';
import { SearchUsersDto } from './dto/search-users.dto';
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    search(dto: SearchUsersDto): Promise<{
        items: {
            id: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
        }[];
    }>;
    private requireUsername;
    getPublicProfile(username: string, currentUserId?: string): Promise<{
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
    updateAvatar(userId: string, avatarUrl: string): Promise<{
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
    updateCover(userId: string, coverUrl: string): Promise<{
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
    follow(currentUserId: string, targetUsername: string): Promise<void>;
    unfollow(currentUserId: string, targetUsername: string): Promise<void>;
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
    deleteAccount(userId: string): Promise<void>;
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
}
