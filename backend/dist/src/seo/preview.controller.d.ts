import type { Request, Response } from 'express';
import { PreviewService } from './preview.service';
export declare class PreviewController {
    private readonly previewService;
    constructor(previewService: PreviewService);
    mixBySlug(username: string, slug: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    mix(id: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    user(username: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    playlist(id: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    private serve;
}
