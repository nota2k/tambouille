import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Prisma is mocked: these cover the service's own rules — reply depth, the
 * timecode requirement, and who may delete — not the database itself.
 */
function createPrismaMock() {
  return {
    comment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    mix: {
      findUnique: jest.fn(),
    },
  };
}

const MIX_ID = 'mix-id';
const MIX_OWNER = 'mix-owner-id';
const AUTHOR = 'author-id';
const STRANGER = 'stranger-id';
const COMMENT_ID = 'comment-id';

describe('CommentsService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let service: CommentsService;

  beforeEach(() => {
    prisma = createPrismaMock();
    service = new CommentsService(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    beforeEach(() => {
      prisma.mix.findUnique.mockResolvedValue({
        id: MIX_ID,
        userId: MIX_OWNER,
      });
      prisma.comment.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'new', ...data }),
      );
    });

    it('rejects a comment on a mix that does not exist', async () => {
      prisma.mix.findUnique.mockResolvedValue(null);
      await expect(
        service.create(MIX_ID, AUTHOR, { body: 'hi', timecodeSec: 10 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('requires a timecode on a top-level comment', async () => {
      await expect(
        service.create(MIX_ID, AUTHOR, { body: 'no timecode' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('accepts timecode 0 rather than treating it as missing', async () => {
      await service.create(MIX_ID, AUTHOR, {
        body: 'right at the start',
        timecodeSec: 0,
      });
      expect(prisma.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ timecodeSec: 0 }),
        }),
      );
    });

    it('returns a replies array on a new top-level comment', async () => {
      await service.create(MIX_ID, AUTHOR, { body: 'nice', timecodeSec: 90 });
      const call = prisma.comment.create.mock.calls[0][0];
      expect(call.include.replies).toBe(true);
    });

    it('refuses to reply to a reply', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: 'r1',
        mixId: MIX_ID,
        parentId: COMMENT_ID,
      });

      await expect(
        service.create(MIX_ID, AUTHOR, { body: 'nested', parentId: 'r1' }),
      ).rejects.toThrow('Cannot reply to a reply');
      expect(prisma.comment.create).not.toHaveBeenCalled();
    });

    it('refuses a parent belonging to another mix', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: COMMENT_ID,
        mixId: 'other-mix',
        parentId: null,
      });

      await expect(
        service.create(MIX_ID, AUTHOR, {
          body: 'cross-mix',
          parentId: COMMENT_ID,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a parent that does not exist', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.create(MIX_ID, AUTHOR, { body: 'orphan', parentId: 'ghost' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores a reply without a timecode, inheriting the parent position', async () => {
      prisma.comment.findUnique.mockResolvedValue({
        id: COMMENT_ID,
        mixId: MIX_ID,
        parentId: null,
      });

      await service.create(MIX_ID, AUTHOR, {
        body: 'agreed',
        parentId: COMMENT_ID,
        timecodeSec: 42,
      });

      const { data } = prisma.comment.create.mock.calls[0][0];
      expect(data).toEqual({
        body: 'agreed',
        mixId: MIX_ID,
        userId: AUTHOR,
        parentId: COMMENT_ID,
      });
      expect(data.timecodeSec).toBeUndefined();
    });
  });

  describe('remove', () => {
    function commentOwnedBy(userId: string) {
      return { id: COMMENT_ID, userId, mix: { userId: MIX_OWNER } };
    }

    it('lets the comment author delete their own comment', async () => {
      prisma.comment.findUnique.mockResolvedValue(commentOwnedBy(AUTHOR));
      await service.remove(COMMENT_ID, AUTHOR);
      expect(prisma.comment.delete).toHaveBeenCalledWith({
        where: { id: COMMENT_ID },
      });
    });

    it("lets the mix owner delete someone else's comment", async () => {
      prisma.comment.findUnique.mockResolvedValue(commentOwnedBy(AUTHOR));
      await service.remove(COMMENT_ID, MIX_OWNER);
      expect(prisma.comment.delete).toHaveBeenCalled();
    });

    it('refuses an unrelated user', async () => {
      prisma.comment.findUnique.mockResolvedValue(commentOwnedBy(AUTHOR));
      await expect(service.remove(COMMENT_ID, STRANGER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.comment.delete).not.toHaveBeenCalled();
    });

    it('reports a missing comment as not found', async () => {
      prisma.comment.findUnique.mockResolvedValue(null);
      await expect(service.remove(COMMENT_ID, AUTHOR)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('list', () => {
    it('returns only top-level comments, ordered by timecode, with replies nested', async () => {
      prisma.comment.findMany.mockResolvedValue([]);
      prisma.comment.count.mockResolvedValue(0);

      await service.list(MIX_ID, {});

      const call = prisma.comment.findMany.mock.calls[0][0];
      expect(call.where).toEqual({ mixId: MIX_ID, parentId: null });
      expect(call.orderBy).toEqual({ timecodeSec: 'asc' });
      expect(call.include.replies.orderBy).toEqual({ createdAt: 'asc' });
    });

    it('paginates', async () => {
      prisma.comment.findMany.mockResolvedValue([]);
      prisma.comment.count.mockResolvedValue(45);

      const result = await service.list(MIX_ID, { page: 3, limit: 20 });

      expect(result).toMatchObject({
        total: 45,
        page: 3,
        limit: 20,
        totalPages: 3,
      });
      expect(prisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });
  });
});
