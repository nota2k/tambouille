import 'dotenv/config';
export interface Options {
    apply: boolean;
    limit: number | null;
    only: string[] | null;
    help: boolean;
}
export declare const USAGE = "Usage : backfill-variantes [--apply] [--limit N] [--only=covers,avatars,banners]";
export declare function parseArgs(argv: string[]): Options;
export declare function largeurDe(cle: string): number | null;
