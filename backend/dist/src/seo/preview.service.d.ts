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
    mix(id: string, context: PreviewContext): Promise<PreviewPage>;
    user(username: string, context: PreviewContext): Promise<PreviewPage>;
    playlist(id: string, context: PreviewContext): Promise<PreviewPage>;
}
