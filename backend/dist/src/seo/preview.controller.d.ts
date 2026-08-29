import type { Request, Response } from 'express';
import { PreviewService } from './preview.service';
export declare class PreviewController {
    private readonly previewService;
    constructor(previewService: PreviewService);
    mix(id: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    user(username: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    playlist(id: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    private serve;
}
