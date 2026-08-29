export declare function slugifierTitre(titre: string): string;
export declare function slugUnique(titre: string, estPris: (slug: string) => Promise<boolean>): Promise<string>;
