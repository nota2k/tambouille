export interface PreviewPage {
    title: string;
    description: string;
    canonical: string;
    image?: string | null;
    type?: 'website' | 'music.song' | 'music.playlist' | 'profile';
    audio?: {
        url: string;
        mimeType: string;
    } | null;
    jsonLd?: Record<string, unknown> | null;
}
export declare const SITE_NAME = "Tambouille";
export declare function escapeHtml(value: string): string;
export declare function previewDescription(text: string | null | undefined, fallback: string): string;
export declare function previewTitle(title: string): string;
export declare function buildPreviewHtml(page: PreviewPage): string;
