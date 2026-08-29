import 'dotenv/config';
import { type EnTetesR2 } from '../common/upload.utils';
export interface Options {
    apply: boolean;
    limit: number | null;
    only: string[] | null;
    help: boolean;
}
export declare const USAGE = "Usage : backfill-cache-control [--apply] [--limit N] [--only=audio,covers,avatars,banners]";
export declare function parseArgs(argv: string[]): Options;
export declare function aBesoinDuCache(entetes: EnTetesR2): boolean;
