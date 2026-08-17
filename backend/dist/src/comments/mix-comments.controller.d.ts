import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PaginationDto } from '../users/dto/pagination.dto';
export declare class MixCommentsController {
    private readonly commentsService;
    constructor(commentsService: CommentsService);
    list(mixId: string, query: PaginationDto): Promise<{
        items: ({
            user: {
                id: string;
                username: string | null;
                displayName: string;
                avatarUrl: string | null;
            };
            replies: ({
                user: {
                    id: string;
                    username: string | null;
                    displayName: string;
                    avatarUrl: string | null;
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string;
                mixId: string;
                body: string;
                timecodeSec: number | null;
                parentId: string | null;
            })[];
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            mixId: string;
            body: string;
            timecodeSec: number | null;
            parentId: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    create(mixId: string, userId: string, dto: CreateCommentDto): Promise<{
        user: {
            id: string;
            username: string | null;
            displayName: string;
            avatarUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        userId: string;
        mixId: string;
        body: string;
        timecodeSec: number | null;
        parentId: string | null;
    }>;
}
