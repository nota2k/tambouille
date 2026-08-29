import { PrismaService } from '../prisma/prisma.service';
import { type MediaBases } from '../common/audio-source';
import { type PreviewPage } from './preview.builder';
export interface PreviewContext {
    bases: MediaBases;
    site: string;
}
export declare class PreviewService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    mixBySlug(username: string, slug: string, context: PreviewContext): Promise<PreviewPage>;
    mix(id: string, context: PreviewContext): Promise<PreviewPage>;
    private pagePourMix;
    user(username: string, context: PreviewContext): Promise<PreviewPage>;
    playlist(id: string, context: PreviewContext): Promise<PreviewPage>;
}
