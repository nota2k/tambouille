import * as runtime from "@prisma/client/runtime/index-browser";
export type * from '../models.js';
export type * from './prismaNamespace.js';
export declare const Decimal: typeof runtime.Decimal;
export declare const NullTypes: {
    DbNull: (new (secret: never) => typeof runtime.DbNull);
    JsonNull: (new (secret: never) => typeof runtime.JsonNull);
    AnyNull: (new (secret: never) => typeof runtime.AnyNull);
};
export declare const DbNull: import("@prisma/client-runtime-utils").DbNullClass;
export declare const JsonNull: import("@prisma/client-runtime-utils").JsonNullClass;
export declare const AnyNull: import("@prisma/client-runtime-utils").AnyNullClass;
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
};
export type ModelName = (typeof ModelName)[keyof typeof ModelName];
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
    readonly description: "description";
    readonly audioUrl: "audioUrl";
    readonly sourceType: "sourceType";
    readonly sourceRef: "sourceRef";
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
export declare const SortOrder: {
    readonly asc: "asc";
    readonly desc: "desc";
};
export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder];
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
