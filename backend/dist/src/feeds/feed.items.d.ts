import type { FeedContext } from './feed.context';
import type { FeedItem } from './feed.types';
export declare const FEED_MIX_SELECT: {
    readonly id: true;
    readonly title: true;
    readonly description: true;
    readonly coverUrl: true;
    readonly durationSec: true;
    readonly createdAt: true;
    readonly audioUrl: true;
    readonly sourceType: true;
    readonly sourceRef: true;
};
export interface FeedMix {
    id: string;
    title: string;
    description: string | null;
    coverUrl: string | null;
    durationSec: number | null;
    createdAt: Date;
    audioUrl: string | null;
    sourceType: string | null;
    sourceRef: string | null;
}
export declare const NOTICE_LECTURE_SUR_LE_SITE = "Certains \u00E9pisodes ne sont pas t\u00E9l\u00E9chargeables et s\u2019\u00E9coutent sur le site : leur lien m\u00E8ne \u00E0 la page du mix.";
export declare function toFeedItem(mix: FeedMix, context: FeedContext): FeedItem;
