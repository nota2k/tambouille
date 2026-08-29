import 'dotenv/config';
export interface Options {
    apply: boolean;
    help: boolean;
}
export declare const USAGE = "Usage : backfill-slugs [--apply]";
export declare function parseArgs(argv: string[]): Options;
