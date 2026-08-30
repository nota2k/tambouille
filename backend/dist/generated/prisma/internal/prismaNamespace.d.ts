import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../models.js";
import { type PrismaClient } from "./class.js";
export type * from '../models.js';
export type DMMF = typeof runtime.DMMF;
export type PrismaPromise<T> = runtime.Types.Public.PrismaPromise<T>;
export declare const PrismaClientKnownRequestError: typeof runtime.PrismaClientKnownRequestError;
export type PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError;
export declare const PrismaClientUnknownRequestError: typeof runtime.PrismaClientUnknownRequestError;
export type PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError;
export declare const PrismaClientRustPanicError: typeof runtime.PrismaClientRustPanicError;
export type PrismaClientRustPanicError = runtime.PrismaClientRustPanicError;
export declare const PrismaClientInitializationError: typeof runtime.PrismaClientInitializationError;
export type PrismaClientInitializationError = runtime.PrismaClientInitializationError;
export declare const PrismaClientValidationError: typeof runtime.PrismaClientValidationError;
export type PrismaClientValidationError = runtime.PrismaClientValidationError;
export declare const sql: typeof runtime.sqltag;
export declare const empty: runtime.Sql;
export declare const join: typeof runtime.join;
export declare const raw: typeof runtime.raw;
export declare const Sql: typeof runtime.Sql;
export type Sql = runtime.Sql;
export declare const Decimal: typeof runtime.Decimal;
export type Decimal = runtime.Decimal;
export type DecimalJsLike = runtime.DecimalJsLike;
export type Extension = runtime.Types.Extensions.UserArgs;
export declare const getExtensionContext: typeof runtime.Extensions.getExtensionContext;
export type Args<T, F extends runtime.Operation> = runtime.Types.Public.Args<T, F>;
export type Payload<T, F extends runtime.Operation = never> = runtime.Types.Public.Payload<T, F>;
export type Result<T, A, F extends runtime.Operation> = runtime.Types.Public.Result<T, A, F>;
export type Exact<A, W> = runtime.Types.Public.Exact<A, W>;
export type PrismaVersion = {
    client: string;
    engine: string;
};
export declare const prismaVersion: PrismaVersion;
export type Bytes = runtime.Bytes;
export type JsonObject = runtime.JsonObject;
export type JsonArray = runtime.JsonArray;
export type JsonValue = runtime.JsonValue;
export type InputJsonObject = runtime.InputJsonObject;
export type InputJsonArray = runtime.InputJsonArray;
export type InputJsonValue = runtime.InputJsonValue;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: runtime.DbNullClass;
export declare const JsonNull: runtime.JsonNullClass;
export declare const AnyNull: runtime.AnyNullClass;
type SelectAndInclude = {
    select: any;
    include: any;
};
type SelectAndOmit = {
    select: any;
    omit: any;
};
type Prisma__Pick<T, K extends keyof T> = {
    [P in K]: T[P];
};
export type Enumerable<T> = T | Array<T>;
export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
};
export type PrismaClientConstructorArgs<Options extends PrismaClientOptions> = [
    PrismaClientOptions
] extends [Options] ? PrismaClientOptions : Subset<Options, PrismaClientOptions>;
export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & (T extends SelectAndInclude ? 'Please either choose `select` or `include`.' : T extends SelectAndOmit ? 'Please either choose `select` or `omit`.' : {});
export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
} & K;
type Without<T, U> = {
    [P in Exclude<keyof T, keyof U>]?: never;
};
export type XOR<T, U> = T extends object ? U extends object ? ((Without<T, U> & U) | (Without<U, T> & T)) & object : U : T;
type IsObject<T extends any> = T extends Array<any> ? False : T extends Date ? False : T extends Uint8Array ? False : T extends BigInt ? False : T extends object ? True : False;
export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T;
type __Either<O extends object, K extends Key> = Omit<O, K> & {
    [P in K]: Prisma__Pick<O, P & keyof O>;
}[K];
type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>;
type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>;
type _Either<O extends object, K extends Key, strict extends Boolean> = {
    1: EitherStrict<O, K>;
    0: EitherLoose<O, K>;
}[strict];
export type Either<O extends object, K extends Key, strict extends Boolean = 1> = O extends unknown ? _Either<O, K, strict> : never;
export type Union = any;
export type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K];
} & {};
export type IntersectOf<U extends Union> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type Overwrite<O extends object, O1 extends object> = {
    [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
} & {};
type _Merge<U extends object> = IntersectOf<Overwrite<U, {
    [K in keyof U]-?: At<U, K>;
}>>;
type Key = string | number | symbol;
type AtStrict<O extends object, K extends Key> = O[K & keyof O];
type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
    1: AtStrict<O, K>;
    0: AtLoose<O, K>;
}[strict];
export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
} & {};
export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
} & {};
type _Record<K extends keyof any, T> = {
    [P in K]: T;
};
type NoExpand<T> = T extends unknown ? T : never;
export type AtLeast<O extends object, K extends string> = NoExpand<O extends unknown ? (K extends keyof O ? {
    [P in K]: O[P];
} & O : O) | {
    [P in keyof O as P extends K ? P : never]-?: O[P];
} & O : never>;
type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;
export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;
export type Boolean = True | False;
export type True = 1;
export type False = 0;
export type Not<B extends Boolean> = {
    0: 1;
    1: 0;
}[B];
export type Extends<A1 extends any, A2 extends any> = [A1] extends [never] ? 0 : A1 extends A2 ? 1 : 0;
export type Has<U extends Union, U1 extends Union> = Not<Extends<Exclude<U1, U>, U1>>;
export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
        0: 0;
        1: 1;
    };
    1: {
        0: 1;
        1: 1;
    };
}[B1][B2];
export type Keys<U extends Union> = U extends unknown ? keyof U : never;
export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O ? O[P] : never;
} : never;
type FieldPaths<T, U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>> = IsObject<T> extends True ? U : T;
export type GetHavingFields<T> = {
    [K in keyof T]: Or<Or<Extends<'OR', K>, Extends<'AND', K>>, Extends<'NOT', K>> extends True ? T[K] extends infer TK ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never> : never : {} extends FieldPaths<T[K]> ? never : K;
}[keyof T];
type _TupleToUnion<T> = T extends (infer E)[] ? E : never;
type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>;
export type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T;
export type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>;
export type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T;
export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>;
type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>;
export declare const ModelName: {
    readonly User: "User";
    readonly PasswordResetToken: "PasswordResetToken";
    readonly Mix: "Mix";
    readonly Playlist: "Playlist";
    readonly PlaylistItem: "PlaylistItem";
    readonly Favorite: "Favorite";
    readonly Follow: "Follow";
    readonly PlayHistory: "PlayHistory";
    readonly Comment: "Comment";
    readonly TracklistEntry: "TracklistEntry";
    readonly WatchedSource: "WatchedSource";
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
export interface TypeMapCb<GlobalOmitOptions = {}> extends runtime.Types.Utils.Fn<{
    extArgs: runtime.Types.Extensions.InternalArgs;
}, runtime.Types.Utils.Record<string, any>> {
    returns: TypeMap<this['params']['extArgs'], GlobalOmitOptions>;
}
export type TypeMap<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
        omit: GlobalOmitOptions;
    };
    meta: {
        modelProps: "user" | "passwordResetToken" | "mix" | "playlist" | "playlistItem" | "favorite" | "follow" | "playHistory" | "comment" | "tracklistEntry" | "watchedSource";
        txIsolationLevel: TransactionIsolationLevel;
    };
    model: {
        User: {
            payload: Prisma.$UserPayload<ExtArgs>;
            fields: Prisma.UserFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.UserFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                findFirst: {
                    args: Prisma.UserFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                findMany: {
                    args: Prisma.UserFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[];
                };
                create: {
                    args: Prisma.UserCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                createMany: {
                    args: Prisma.UserCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[];
                };
                delete: {
                    args: Prisma.UserDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                update: {
                    args: Prisma.UserUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                deleteMany: {
                    args: Prisma.UserDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.UserUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>[];
                };
                upsert: {
                    args: Prisma.UserUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$UserPayload>;
                };
                aggregate: {
                    args: Prisma.UserAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateUser>;
                };
                groupBy: {
                    args: Prisma.UserGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.UserGroupByOutputType>[];
                };
                count: {
                    args: Prisma.UserCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.UserCountAggregateOutputType> | number;
                };
            };
        };
        PasswordResetToken: {
            payload: Prisma.$PasswordResetTokenPayload<ExtArgs>;
            fields: Prisma.PasswordResetTokenFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PasswordResetTokenFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PasswordResetTokenFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                findFirst: {
                    args: Prisma.PasswordResetTokenFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PasswordResetTokenFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                findMany: {
                    args: Prisma.PasswordResetTokenFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[];
                };
                create: {
                    args: Prisma.PasswordResetTokenCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                createMany: {
                    args: Prisma.PasswordResetTokenCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PasswordResetTokenCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[];
                };
                delete: {
                    args: Prisma.PasswordResetTokenDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                update: {
                    args: Prisma.PasswordResetTokenUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                deleteMany: {
                    args: Prisma.PasswordResetTokenDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PasswordResetTokenUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PasswordResetTokenUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>[];
                };
                upsert: {
                    args: Prisma.PasswordResetTokenUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PasswordResetTokenPayload>;
                };
                aggregate: {
                    args: Prisma.PasswordResetTokenAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePasswordResetToken>;
                };
                groupBy: {
                    args: Prisma.PasswordResetTokenGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PasswordResetTokenGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PasswordResetTokenCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PasswordResetTokenCountAggregateOutputType> | number;
                };
            };
        };
        Mix: {
            payload: Prisma.$MixPayload<ExtArgs>;
            fields: Prisma.MixFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.MixFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.MixFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                findFirst: {
                    args: Prisma.MixFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.MixFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                findMany: {
                    args: Prisma.MixFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>[];
                };
                create: {
                    args: Prisma.MixCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                createMany: {
                    args: Prisma.MixCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.MixCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>[];
                };
                delete: {
                    args: Prisma.MixDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                update: {
                    args: Prisma.MixUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                deleteMany: {
                    args: Prisma.MixDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.MixUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.MixUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>[];
                };
                upsert: {
                    args: Prisma.MixUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$MixPayload>;
                };
                aggregate: {
                    args: Prisma.MixAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateMix>;
                };
                groupBy: {
                    args: Prisma.MixGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MixGroupByOutputType>[];
                };
                count: {
                    args: Prisma.MixCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.MixCountAggregateOutputType> | number;
                };
            };
        };
        Playlist: {
            payload: Prisma.$PlaylistPayload<ExtArgs>;
            fields: Prisma.PlaylistFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PlaylistFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PlaylistFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                findFirst: {
                    args: Prisma.PlaylistFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PlaylistFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                findMany: {
                    args: Prisma.PlaylistFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>[];
                };
                create: {
                    args: Prisma.PlaylistCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                createMany: {
                    args: Prisma.PlaylistCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PlaylistCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>[];
                };
                delete: {
                    args: Prisma.PlaylistDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                update: {
                    args: Prisma.PlaylistUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                deleteMany: {
                    args: Prisma.PlaylistDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PlaylistUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PlaylistUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>[];
                };
                upsert: {
                    args: Prisma.PlaylistUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistPayload>;
                };
                aggregate: {
                    args: Prisma.PlaylistAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePlaylist>;
                };
                groupBy: {
                    args: Prisma.PlaylistGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlaylistGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PlaylistCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlaylistCountAggregateOutputType> | number;
                };
            };
        };
        PlaylistItem: {
            payload: Prisma.$PlaylistItemPayload<ExtArgs>;
            fields: Prisma.PlaylistItemFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PlaylistItemFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PlaylistItemFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                findFirst: {
                    args: Prisma.PlaylistItemFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PlaylistItemFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                findMany: {
                    args: Prisma.PlaylistItemFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>[];
                };
                create: {
                    args: Prisma.PlaylistItemCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                createMany: {
                    args: Prisma.PlaylistItemCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PlaylistItemCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>[];
                };
                delete: {
                    args: Prisma.PlaylistItemDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                update: {
                    args: Prisma.PlaylistItemUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                deleteMany: {
                    args: Prisma.PlaylistItemDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PlaylistItemUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PlaylistItemUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>[];
                };
                upsert: {
                    args: Prisma.PlaylistItemUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlaylistItemPayload>;
                };
                aggregate: {
                    args: Prisma.PlaylistItemAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePlaylistItem>;
                };
                groupBy: {
                    args: Prisma.PlaylistItemGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlaylistItemGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PlaylistItemCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlaylistItemCountAggregateOutputType> | number;
                };
            };
        };
        Favorite: {
            payload: Prisma.$FavoritePayload<ExtArgs>;
            fields: Prisma.FavoriteFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.FavoriteFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.FavoriteFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                findFirst: {
                    args: Prisma.FavoriteFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.FavoriteFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                findMany: {
                    args: Prisma.FavoriteFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>[];
                };
                create: {
                    args: Prisma.FavoriteCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                createMany: {
                    args: Prisma.FavoriteCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.FavoriteCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>[];
                };
                delete: {
                    args: Prisma.FavoriteDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                update: {
                    args: Prisma.FavoriteUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                deleteMany: {
                    args: Prisma.FavoriteDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.FavoriteUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.FavoriteUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>[];
                };
                upsert: {
                    args: Prisma.FavoriteUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FavoritePayload>;
                };
                aggregate: {
                    args: Prisma.FavoriteAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateFavorite>;
                };
                groupBy: {
                    args: Prisma.FavoriteGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.FavoriteGroupByOutputType>[];
                };
                count: {
                    args: Prisma.FavoriteCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.FavoriteCountAggregateOutputType> | number;
                };
            };
        };
        Follow: {
            payload: Prisma.$FollowPayload<ExtArgs>;
            fields: Prisma.FollowFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.FollowFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.FollowFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                findFirst: {
                    args: Prisma.FollowFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.FollowFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                findMany: {
                    args: Prisma.FollowFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>[];
                };
                create: {
                    args: Prisma.FollowCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                createMany: {
                    args: Prisma.FollowCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.FollowCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>[];
                };
                delete: {
                    args: Prisma.FollowDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                update: {
                    args: Prisma.FollowUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                deleteMany: {
                    args: Prisma.FollowDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.FollowUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.FollowUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>[];
                };
                upsert: {
                    args: Prisma.FollowUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$FollowPayload>;
                };
                aggregate: {
                    args: Prisma.FollowAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateFollow>;
                };
                groupBy: {
                    args: Prisma.FollowGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.FollowGroupByOutputType>[];
                };
                count: {
                    args: Prisma.FollowCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.FollowCountAggregateOutputType> | number;
                };
            };
        };
        PlayHistory: {
            payload: Prisma.$PlayHistoryPayload<ExtArgs>;
            fields: Prisma.PlayHistoryFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.PlayHistoryFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.PlayHistoryFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                findFirst: {
                    args: Prisma.PlayHistoryFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.PlayHistoryFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                findMany: {
                    args: Prisma.PlayHistoryFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>[];
                };
                create: {
                    args: Prisma.PlayHistoryCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                createMany: {
                    args: Prisma.PlayHistoryCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.PlayHistoryCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>[];
                };
                delete: {
                    args: Prisma.PlayHistoryDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                update: {
                    args: Prisma.PlayHistoryUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                deleteMany: {
                    args: Prisma.PlayHistoryDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.PlayHistoryUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.PlayHistoryUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>[];
                };
                upsert: {
                    args: Prisma.PlayHistoryUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$PlayHistoryPayload>;
                };
                aggregate: {
                    args: Prisma.PlayHistoryAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregatePlayHistory>;
                };
                groupBy: {
                    args: Prisma.PlayHistoryGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlayHistoryGroupByOutputType>[];
                };
                count: {
                    args: Prisma.PlayHistoryCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.PlayHistoryCountAggregateOutputType> | number;
                };
            };
        };
        Comment: {
            payload: Prisma.$CommentPayload<ExtArgs>;
            fields: Prisma.CommentFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.CommentFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.CommentFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                findFirst: {
                    args: Prisma.CommentFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.CommentFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                findMany: {
                    args: Prisma.CommentFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>[];
                };
                create: {
                    args: Prisma.CommentCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                createMany: {
                    args: Prisma.CommentCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.CommentCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>[];
                };
                delete: {
                    args: Prisma.CommentDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                update: {
                    args: Prisma.CommentUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                deleteMany: {
                    args: Prisma.CommentDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.CommentUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.CommentUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>[];
                };
                upsert: {
                    args: Prisma.CommentUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$CommentPayload>;
                };
                aggregate: {
                    args: Prisma.CommentAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateComment>;
                };
                groupBy: {
                    args: Prisma.CommentGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CommentGroupByOutputType>[];
                };
                count: {
                    args: Prisma.CommentCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.CommentCountAggregateOutputType> | number;
                };
            };
        };
        TracklistEntry: {
            payload: Prisma.$TracklistEntryPayload<ExtArgs>;
            fields: Prisma.TracklistEntryFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.TracklistEntryFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.TracklistEntryFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                findFirst: {
                    args: Prisma.TracklistEntryFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.TracklistEntryFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                findMany: {
                    args: Prisma.TracklistEntryFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>[];
                };
                create: {
                    args: Prisma.TracklistEntryCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                createMany: {
                    args: Prisma.TracklistEntryCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.TracklistEntryCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>[];
                };
                delete: {
                    args: Prisma.TracklistEntryDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                update: {
                    args: Prisma.TracklistEntryUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                deleteMany: {
                    args: Prisma.TracklistEntryDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.TracklistEntryUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.TracklistEntryUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>[];
                };
                upsert: {
                    args: Prisma.TracklistEntryUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$TracklistEntryPayload>;
                };
                aggregate: {
                    args: Prisma.TracklistEntryAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateTracklistEntry>;
                };
                groupBy: {
                    args: Prisma.TracklistEntryGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.TracklistEntryGroupByOutputType>[];
                };
                count: {
                    args: Prisma.TracklistEntryCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.TracklistEntryCountAggregateOutputType> | number;
                };
            };
        };
        WatchedSource: {
            payload: Prisma.$WatchedSourcePayload<ExtArgs>;
            fields: Prisma.WatchedSourceFieldRefs;
            operations: {
                findUnique: {
                    args: Prisma.WatchedSourceFindUniqueArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload> | null;
                };
                findUniqueOrThrow: {
                    args: Prisma.WatchedSourceFindUniqueOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                findFirst: {
                    args: Prisma.WatchedSourceFindFirstArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload> | null;
                };
                findFirstOrThrow: {
                    args: Prisma.WatchedSourceFindFirstOrThrowArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                findMany: {
                    args: Prisma.WatchedSourceFindManyArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>[];
                };
                create: {
                    args: Prisma.WatchedSourceCreateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                createMany: {
                    args: Prisma.WatchedSourceCreateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                createManyAndReturn: {
                    args: Prisma.WatchedSourceCreateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>[];
                };
                delete: {
                    args: Prisma.WatchedSourceDeleteArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                update: {
                    args: Prisma.WatchedSourceUpdateArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                deleteMany: {
                    args: Prisma.WatchedSourceDeleteManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateMany: {
                    args: Prisma.WatchedSourceUpdateManyArgs<ExtArgs>;
                    result: BatchPayload;
                };
                updateManyAndReturn: {
                    args: Prisma.WatchedSourceUpdateManyAndReturnArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>[];
                };
                upsert: {
                    args: Prisma.WatchedSourceUpsertArgs<ExtArgs>;
                    result: runtime.Types.Utils.PayloadToResult<Prisma.$WatchedSourcePayload>;
                };
                aggregate: {
                    args: Prisma.WatchedSourceAggregateArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.AggregateWatchedSource>;
                };
                groupBy: {
                    args: Prisma.WatchedSourceGroupByArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.WatchedSourceGroupByOutputType>[];
                };
                count: {
                    args: Prisma.WatchedSourceCountArgs<ExtArgs>;
                    result: runtime.Types.Utils.Optional<Prisma.WatchedSourceCountAggregateOutputType> | number;
                };
            };
        };
    };
} & {
    other: {
        payload: any;
        operations: {
            $executeRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $executeRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
            $queryRaw: {
                args: [query: TemplateStringsArray | Sql, ...values: any[]];
                result: any;
            };
            $queryRawUnsafe: {
                args: [query: string, ...values: any[]];
                result: any;
            };
        };
    };
};
export declare const TransactionIsolationLevel: {
    readonly ReadUncommitted: "ReadUncommitted";
    readonly ReadCommitted: "ReadCommitted";
    readonly RepeatableRead: "RepeatableRead";
    readonly Serializable: "Serializable";
};
export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel];
export declare const UserScalarFieldEnum: {
    readonly id: "id";
    readonly email: "email";
    readonly username: "username";
    readonly password: "password";
    readonly googleId: "googleId";
    readonly keycloakId: "keycloakId";
    readonly incongruesUsername: "incongruesUsername";
    readonly incongruesToken: "incongruesToken";
    readonly incongruesTokenAt: "incongruesTokenAt";
    readonly incongruesVerifiedAt: "incongruesVerifiedAt";
    readonly displayName: "displayName";
    readonly bio: "bio";
    readonly avatarUrl: "avatarUrl";
    readonly coverUrl: "coverUrl";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
};
export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum];
export declare const PasswordResetTokenScalarFieldEnum: {
    readonly id: "id";
    readonly tokenHash: "tokenHash";
    readonly userId: "userId";
    readonly expiresAt: "expiresAt";
    readonly usedAt: "usedAt";
    readonly createdAt: "createdAt";
};
export type PasswordResetTokenScalarFieldEnum = (typeof PasswordResetTokenScalarFieldEnum)[keyof typeof PasswordResetTokenScalarFieldEnum];
export declare const MixScalarFieldEnum: {
    readonly id: "id";
    readonly title: "title";
    readonly slug: "slug";
    readonly description: "description";
    readonly artist: "artist";
    readonly audioUrl: "audioUrl";
    readonly sourceType: "sourceType";
    readonly sourceRef: "sourceRef";
    readonly sourcePageUrl: "sourcePageUrl";
    readonly coverUrl: "coverUrl";
    readonly durationSec: "durationSec";
    readonly playsCount: "playsCount";
    readonly tags: "tags";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly userId: "userId";
};
export type MixScalarFieldEnum = (typeof MixScalarFieldEnum)[keyof typeof MixScalarFieldEnum];
export declare const PlaylistScalarFieldEnum: {
    readonly id: "id";
    readonly title: "title";
    readonly description: "description";
    readonly createdAt: "createdAt";
    readonly updatedAt: "updatedAt";
    readonly userId: "userId";
};
export type PlaylistScalarFieldEnum = (typeof PlaylistScalarFieldEnum)[keyof typeof PlaylistScalarFieldEnum];
export declare const PlaylistItemScalarFieldEnum: {
    readonly id: "id";
    readonly position: "position";
    readonly addedAt: "addedAt";
    readonly playlistId: "playlistId";
    readonly mixId: "mixId";
};
export type PlaylistItemScalarFieldEnum = (typeof PlaylistItemScalarFieldEnum)[keyof typeof PlaylistItemScalarFieldEnum];
export declare const FavoriteScalarFieldEnum: {
    readonly id: "id";
    readonly createdAt: "createdAt";
    readonly userId: "userId";
    readonly mixId: "mixId";
};
export type FavoriteScalarFieldEnum = (typeof FavoriteScalarFieldEnum)[keyof typeof FavoriteScalarFieldEnum];
export declare const FollowScalarFieldEnum: {
    readonly id: "id";
    readonly createdAt: "createdAt";
    readonly followerId: "followerId";
    readonly followingId: "followingId";
};
export type FollowScalarFieldEnum = (typeof FollowScalarFieldEnum)[keyof typeof FollowScalarFieldEnum];
export declare const PlayHistoryScalarFieldEnum: {
    readonly id: "id";
    readonly playedAt: "playedAt";
    readonly userId: "userId";
    readonly mixId: "mixId";
};
export type PlayHistoryScalarFieldEnum = (typeof PlayHistoryScalarFieldEnum)[keyof typeof PlayHistoryScalarFieldEnum];
export declare const CommentScalarFieldEnum: {
    readonly id: "id";
    readonly body: "body";
    readonly timecodeSec: "timecodeSec";
    readonly createdAt: "createdAt";
    readonly mixId: "mixId";
    readonly userId: "userId";
    readonly parentId: "parentId";
};
export type CommentScalarFieldEnum = (typeof CommentScalarFieldEnum)[keyof typeof CommentScalarFieldEnum];
export declare const TracklistEntryScalarFieldEnum: {
    readonly id: "id";
    readonly artist: "artist";
    readonly title: "title";
    readonly timecodeSec: "timecodeSec";
    readonly mixId: "mixId";
};
export type TracklistEntryScalarFieldEnum = (typeof TracklistEntryScalarFieldEnum)[keyof typeof TracklistEntryScalarFieldEnum];
export declare const WatchedSourceScalarFieldEnum: {
    readonly id: "id";
    readonly userId: "userId";
    readonly url: "url";
    readonly label: "label";
    readonly resolver: "resolver";
    readonly items: "items";
    readonly fetchedAt: "fetchedAt";
    readonly lastError: "lastError";
    readonly position: "position";
    readonly createdAt: "createdAt";
};
export type WatchedSourceScalarFieldEnum = (typeof WatchedSourceScalarFieldEnum)[keyof typeof WatchedSourceScalarFieldEnum];
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
export declare const JsonNullValueInput: {
    readonly JsonNull: runtime.JsonNullClass;
};
export type JsonNullValueInput = (typeof JsonNullValueInput)[keyof typeof JsonNullValueInput];
export declare const QueryMode: {
    readonly default: "default";
    readonly insensitive: "insensitive";
};
export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode];
export declare const NullsOrder: {
    readonly first: "first";
    readonly last: "last";
};
export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder];
export declare const JsonNullValueFilter: {
    readonly DbNull: runtime.DbNullClass;
    readonly JsonNull: runtime.JsonNullClass;
    readonly AnyNull: runtime.AnyNullClass;
};
export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter];
export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>;
export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>;
export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>;
export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>;
export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>;
export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>;
export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>;
export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>;
export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>;
export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>;
export type BatchPayload = {
    count: number;
};
export declare const defineExtension: runtime.Types.Extensions.ExtendsHook<"define", TypeMapCb, runtime.Types.Extensions.DefaultArgs>;
export type DefaultPrismaClient = PrismaClient;
export type ErrorFormat = 'pretty' | 'colorless' | 'minimal';
export interface PrismaClientBaseOptions {
    errorFormat?: ErrorFormat;
    log?: (LogLevel | LogDefinition)[];
    transactionOptions?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: TransactionIsolationLevel;
    };
    omit?: GlobalOmitConfig;
    comments?: runtime.SqlCommenterPlugin[];
    queryPlanCacheMaxSize?: number;
}
export interface PrismaClientOptionsWithAccelerateUrl extends PrismaClientBaseOptions {
    accelerateUrl: string;
    adapter?: never;
}
export interface PrismaClientOptionsWithAdapter extends PrismaClientBaseOptions {
    adapter: runtime.SqlDriverAdapterFactory;
    accelerateUrl?: never;
}
export type PrismaClientOptions = PrismaClientOptionsWithAccelerateUrl | PrismaClientOptionsWithAdapter;
export type GlobalOmitConfig = {
    user?: Prisma.UserOmit;
    passwordResetToken?: Prisma.PasswordResetTokenOmit;
    mix?: Prisma.MixOmit;
    playlist?: Prisma.PlaylistOmit;
    playlistItem?: Prisma.PlaylistItemOmit;
    favorite?: Prisma.FavoriteOmit;
    follow?: Prisma.FollowOmit;
    playHistory?: Prisma.PlayHistoryOmit;
    comment?: Prisma.CommentOmit;
    tracklistEntry?: Prisma.TracklistEntryOmit;
    watchedSource?: Prisma.WatchedSourceOmit;
};
export type LogLevel = 'info' | 'query' | 'warn' | 'error';
export type LogDefinition = {
    level: LogLevel;
    emit: 'stdout' | 'event';
};
export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;
export type GetLogType<T> = CheckIsLogLevel<T extends LogDefinition ? T['level'] : T>;
export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition> ? GetLogType<T[number]> : never;
export type QueryEvent = {
    timestamp: Date;
    query: string;
    params: string;
    duration: number;
    target: string;
};
export type LogEvent = {
    timestamp: Date;
    message: string;
    target: string;
};
export type PrismaAction = 'findUnique' | 'findUniqueOrThrow' | 'findMany' | 'findFirst' | 'findFirstOrThrow' | 'create' | 'createMany' | 'createManyAndReturn' | 'update' | 'updateMany' | 'updateManyAndReturn' | 'upsert' | 'delete' | 'deleteMany' | 'executeRaw' | 'queryRaw' | 'aggregate' | 'count' | 'runCommandRaw' | 'findRaw' | 'groupBy';
export type TransactionClient = Omit<DefaultPrismaClient, runtime.ITXClientDenyList>;
