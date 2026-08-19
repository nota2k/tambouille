export interface Fournee {
    number: number;
    title: string;
    period: string;
    intro: string;
    mixIds: string[];
}
export declare class FourneeParseError extends Error {
    constructor(path: string, detail: string);
}
export declare function parseFournee(raw: string, path: string): Fournee;
export declare function fourneesDir(): string;
export declare function readFournees(dir?: string): Fournee[];
