export declare const FORUM_ORIGIN = "https://www.musiques-incongrues.net";
export interface FlarumDiscussion {
    id: string;
    title: string;
    createdAt: string;
    pageUrl: string;
    contentHtml: string;
    termNames: string[];
}
export declare class FlarumClient {
    listByAuthor(username: string): Promise<FlarumDiscussion[]>;
    getDiscussion(id: string): Promise<FlarumDiscussion>;
    private lire;
    private assembler;
}
