"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const authorSelect = {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
};
let CommentsService = class CommentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(mixId, query) {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const where = { mixId, parentId: null };
        const [items, total] = await Promise.all([
            this.prisma.comment.findMany({
                where,
                orderBy: { timecodeSec: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    user: { select: authorSelect },
                    replies: {
                        orderBy: { createdAt: 'asc' },
                        include: { user: { select: authorSelect } },
                    },
                },
            }),
            this.prisma.comment.count({ where }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        };
    }
    async create(mixId, userId, dto) {
        const mix = await this.prisma.mix.findUnique({ where: { id: mixId } });
        if (!mix) {
            throw new common_1.NotFoundException('Mix not found');
        }
        if (dto.parentId) {
            const parent = await this.prisma.comment.findUnique({
                where: { id: dto.parentId },
            });
            if (!parent || parent.mixId !== mixId) {
                throw new common_1.BadRequestException('Parent comment not found on this mix');
            }
            if (parent.parentId !== null) {
                throw new common_1.BadRequestException('Cannot reply to a reply');
            }
            return this.prisma.comment.create({
                data: {
                    body: dto.body,
                    mixId,
                    userId,
                    parentId: dto.parentId,
                },
                include: { user: { select: authorSelect } },
            });
        }
        if (dto.timecodeSec === undefined) {
            throw new common_1.BadRequestException('timecodeSec is required for a top-level comment');
        }
        return this.prisma.comment.create({
            data: {
                body: dto.body,
                mixId,
                userId,
                timecodeSec: dto.timecodeSec,
            },
            include: {
                user: { select: authorSelect },
                replies: true,
            },
        });
    }
    async remove(commentId, userId) {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            include: { mix: { select: { userId: true } } },
        });
        if (!comment) {
            throw new common_1.NotFoundException('Comment not found');
        }
        if (comment.userId !== userId && comment.mix.userId !== userId) {
            throw new common_1.ForbiddenException('You can only delete your own comments or comments on your own mixes');
        }
        await this.prisma.comment.delete({ where: { id: commentId } });
    }
};
exports.CommentsService = CommentsService;
exports.CommentsService = CommentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommentsService);
//# sourceMappingURL=comments.service.js.map