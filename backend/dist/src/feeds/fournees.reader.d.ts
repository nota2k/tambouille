export interface MixRef {
    username: string;
    slug: string;
}
export interface Fournee {
    number: number;
    title: string;
    period: string;
    intro: string;
    mixRefs: MixRef[];
}
export declare class FourneeParseError extends Error {
    constructor(path: string, detail: string);
}
export declare function parseFournee(raw: string, path: string): Fournee;
export declare function fourneesDir(): string;
export declare function readFournees(dir?: string): Fournee[];
