import { ImportsService } from '../imports/imports.service';
import { BandcampReader } from './bandcamp.reader';
import { type ResolvedSource } from './veille.types';
export declare function canonicalUrl(raw: string): string;
export declare function findDeclaredFeed(html: string, pageUrl: string): string | null;
export declare class VeilleResolver {
    private readonly bandcamp;
    private readonly imports;
    constructor(bandcamp: BandcampReader, imports: ImportsService);
    resolve(rawUrl: string): Promise<ResolvedSource>;
    refresh(storedUrl: string): Promise<ResolvedSource>;
    private resolveExact;
    private viaImports;
    private isCatchAll;
    private declaredFeed;
}
