import 'dotenv/config';
export interface Options {
    apply: boolean;
    limit: number | null;
    only: string[] | null;
    keepOriginal: boolean;
    help: boolean;
}
export declare const USAGE = "Usage : backfill-webp [--apply] [--limit N] [--only=covers,avatars,banners] [--keep-original]";
export declare function parseArgs(argv: string[]): Options;
export declare function diskPathOf(value: string): string;
export declare function isLocal(value: string): boolean;
export declare function isRemote(value: string): boolean;
export declare function formatOctets(octets: number): string;
