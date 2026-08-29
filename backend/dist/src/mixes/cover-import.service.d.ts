export declare class CoverImportService {
    private readonly logger;
    importFromUrl(coverSourceUrl: string): Promise<string | null>;
    resolveCoverUrl(uploadedKey: string | undefined, coverSourceUrl: string | undefined): Promise<string | undefined>;
}
