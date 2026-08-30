export declare const FORUM_ORIGIN = "https://www.musiques-incongrues.net";
export interface FlarumDiscussion {
    id: string;
    title: string;
    createdAt: string;
    pageUrl: string;
    contentHtml: string;
    termNames: string[];
    authorUsername?: string;
}
export interface FlarumPost {
    id: string;
    contentHtml: string;
    createdAt: string;
    authorUsername?: string;
}
export declare class FlarumClient {
    listByAuthor(username: string): Promise<FlarumDiscussion[]>;
    listPostsByAuthor(username: string, limit?: number): Promise<FlarumPost[]>;
    findUserId(username: string): Promise<string | null>;
    readProfileAnswers(userId: string): Promise<string[]>;
    listRecentDiscussions(limit?: number): Promise<FlarumDiscussion[]>;
    getDiscussion(id: string): Promise<FlarumDiscussion>;
    private lireJson;
    private lire;
    private assembler;
}
