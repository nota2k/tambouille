import { VeilleService } from './veille.service';
import { AddSourceDto } from './dto/add-source.dto';
import { UpdateSourceDto } from './dto/update-source.dto';
export declare class VeilleController {
    private readonly veille;
    constructor(veille: VeilleService);
    addSource(userId: string, body: AddSourceDto): Promise<import("./veille.types").VeilleSource>;
    updateSource(userId: string, id: string, body: UpdateSourceDto): Promise<import("./veille.types").VeilleSource>;
    removeSource(userId: string, id: string): Promise<void>;
    getFeed(username: string, viewerId?: string): Promise<import("./veille.types").VeilleFeed>;
}
