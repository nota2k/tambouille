import { FlarumClient } from '../imports/flarum.client';
import { MusiquesIncongruesImporter } from '../imports/musiques-incongrues.importer';
import { MixesService } from '../mixes/mixes.service';
import { PrismaService } from '../prisma/prisma.service';
export declare const DEBOUNCE_MS = 60000;
export declare const RATTRAPAGE_MS: number;
export declare class IncongruesSyncService {
    private readonly flarum;
    private readonly importeur;
    private readonly mixes;
    private readonly prisma;
    private readonly logger;
    private readonly enCours;
    private dernierRattrapage;
    private dernierPassageSonnerie;
    constructor(flarum: FlarumClient, importeur: MusiquesIncongruesImporter, mixes: MixesService, prisma: PrismaService);
    syncUser(userId: string, incongruesUsername: string): Promise<number>;
    syncAll(): Promise<number>;
    syncDepuisSonnerie(): Promise<number>;
    syncAllRattrapageHoraire(): Promise<number>;
    private estBienDe;
    private faire;
}
