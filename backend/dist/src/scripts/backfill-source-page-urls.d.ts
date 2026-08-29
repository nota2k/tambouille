import 'dotenv/config';
export interface Options {
    apply: boolean;
    help: boolean;
}
export declare const USAGE = "Usage : backfill-source-page-urls [--apply]";
export declare function parseArgs(argv: string[]): Options;
type ReponseLyl = {
    data?: {
        slug?: string;
    }[];
};
export type LecteurJson = (url: string) => Promise<ReponseLyl>;
export declare function pageLylDepuisAudio(audioUrl: string, lire?: LecteurJson): Promise<string | null>;
export type LecteurHtml = (url: string) => Promise<string>;
export declare function parsePlaylistsBrain(html: string, indexUrl?: string): Map<string, string>;
export declare function chercheurBrain(lire?: LecteurHtml): (audioUrl: string) => Promise<string | null>;
interface Ligne {
    id: string;
    title: string;
    sourceType: string | null;
    sourceRef: string | null;
}
export interface Chercheurs {
    lyl: (audioUrl: string) => Promise<string | null>;
    brain: (audioUrl: string) => Promise<string | null>;
}
export declare function chercheursParDefaut(): Chercheurs;
export declare function pageDeLaLigne(mix: Ligne, chercheurs: Chercheurs): Promise<string | null>;
export {};
