import { ImportsService } from './imports.service';
declare class ResolveDto {
    url: string;
}
declare class ItemDto {
    ref: string;
}
export declare class ImportsController {
    private readonly imports;
    constructor(imports: ImportsService);
    resolve(dto: ResolveDto): Promise<{
        kind: "mix";
        mix: import("./source-importer").MixImport;
    } | {
        kind: "list";
        items: import("./source-importer").SourceItem[];
    }>;
    importItem(dto: ItemDto): Promise<import("./source-importer").MixImport>;
}
export {};
