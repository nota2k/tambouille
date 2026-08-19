import type { Request, Response } from 'express';
import { FeedsService } from './feeds.service';
export declare class FeedsController {
    private readonly feedsService;
    constructor(feedsService: FeedsService);
    site(request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    user(username: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    playlist(id: string, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    fournee(numero: number, request: Request, response: Response, ifNoneMatch?: string): Promise<void>;
    private serve;
}
