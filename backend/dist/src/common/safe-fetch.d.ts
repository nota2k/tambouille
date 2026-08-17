import { type LookupAddress, type LookupOptions } from 'node:dns';
import { Agent, fetch as undiciFetch, type Dispatcher } from 'undici';
export declare const BLOCKED_ADDRESS_MESSAGE = "Cette adresse n'est pas accessible depuis Tambouille";
export declare function isBlockedAddress(ip: string): boolean;
export declare function filterSafeAddresses(addresses: readonly {
    address: string;
}[]): {
    address: string;
}[];
export type GuardedLookup = (hostname: string, options: LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void) => void;
export declare const guardedLookup: GuardedLookup;
export declare function createGuardedAgent(lookup?: GuardedLookup): Agent;
export declare function useDispatcherForTests(next: Dispatcher): () => void;
type UndiciResponse = Awaited<ReturnType<typeof undiciFetch>>;
export declare function readCappedBody(response: UndiciResponse, maxBytes: number): Promise<Buffer>;
export declare function rethrowBodyReadError(err: unknown): never;
export declare function safeFetch(rawUrl: string, options: {
    maxBytes: number;
    timeoutMs: number;
    accept?: string;
}): Promise<{
    url: URL;
    contentType: string;
    body: Buffer;
}>;
export {};
