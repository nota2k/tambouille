import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type MixModel = runtime.Types.Result.DefaultSelection<Prisma.$MixPayload>;
export type AggregateMix = {
    _count: MixCountAggregateOutputType | null;
    _avg: MixAvgAggregateOutputType | null;
    _sum: MixSumAggregateOutputType | null;
    _min: MixMinAggregateOutputType | null;
    _max: MixMaxAggregateOutputType | null;
};
export type MixAvgAggregateOutputType = {
    durationSec: number | null;
    playsCount: number | null;
};
export type MixSumAggregateOutputType = {
    durationSec: number | null;
    playsCount: number | null;
};
export type MixMinAggregateOutputType = {
    id: string | null;
    title: string | null;
    description: string | null;
    artist: string | null;
    audioUrl: string | null;
    sourceType: string | null;
    sourceRef: string | null;
    coverUrl: string | null;
    durationSec: number | null;
    playsCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    userId: string | null;
};
export type MixMaxAggregateOutputType = {
    id: string | null;
    title: string | null;
    description: string | null;
    artist: string | null;
    audioUrl: string | null;
    sourceType: string | null;
    sourceRef: string | null;
    coverUrl: string | null;
    durationSec: number | null;
    playsCount: number | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    userId: string | null;
};
export type MixCountAggregateOutputType = {
    id: number;
    title: number;
    description: number;
    artist: number;
    audioUrl: number;
    sourceType: number;
    sourceRef: number;
    coverUrl: number;
    durationSec: number;
    playsCount: number;
    tags: number;
    createdAt: number;
    updatedAt: number;
    userId: number;
    _all: number;
};
export type MixAvgAggregateInputType = {
    durationSec?: true;
    playsCount?: true;
};
export type MixSumAggregateInputType = {
    durationSec?: true;
    playsCount?: true;
};
export type MixMinAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    artist?: true;
    audioUrl?: true;
    sourceType?: true;
    sourceRef?: true;
    coverUrl?: true;
    durationSec?: true;
    playsCount?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
};
export type MixMaxAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    artist?: true;
    audioUrl?: true;
    sourceType?: true;
    sourceRef?: true;
    coverUrl?: true;
    durationSec?: true;
    playsCount?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
};
export type MixCountAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    artist?: true;
    audioUrl?: true;
    sourceType?: true;
    sourceRef?: true;
    coverUrl?: true;
    durationSec?: true;
    playsCount?: true;
    tags?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
    _all?: true;
};
export type MixAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.MixWhereInput;
    orderBy?: Prisma.MixOrderByWithRelationInput | Prisma.MixOrderByWithRelationInput[];
    cursor?: Prisma.MixWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | MixCountAggregateInputType;
    _avg?: MixAvgAggregateInputType;
    _sum?: MixSumAggregateInputType;
    _min?: MixMinAggregateInputType;
    _max?: MixMaxAggregateInputType;
};
export type GetMixAggregateType<T extends MixAggregateArgs> = {
    [P in keyof T & keyof AggregateMix]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateMix[P]> : Prisma.GetScalarType<T[P], AggregateMix[P]>;
};
export type MixGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.MixWhereInput;
    orderBy?: Prisma.MixOrderByWithAggregationInput | Prisma.MixOrderByWithAggregationInput[];
    by: Prisma.MixScalarFieldEnum[] | Prisma.MixScalarFieldEnum;
    having?: Prisma.MixScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: MixCountAggregateInputType | true;
    _avg?: MixAvgAggregateInputType;
    _sum?: MixSumAggregateInputType;
    _min?: MixMinAggregateInputType;
    _max?: MixMaxAggregateInputType;
};
export type MixGroupByOutputType = {
    id: string;
    title: string;
    description: string | null;
    artist: string | null;
    audioUrl: string | null;
    sourceType: string | null;
    sourceRef: string | null;
    coverUrl: string | null;
    durationSec: number | null;
    playsCount: number;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    _count: MixCountAggregateOutputType | null;
    _avg: MixAvgAggregateOutputType | null;
    _sum: MixSumAggregateOutputType | null;
    _min: MixMinAggregateOutputType | null;
    _max: MixMaxAggregateOutputType | null;
};
export type GetMixGroupByPayload<T extends MixGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<MixGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof MixGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], MixGroupByOutputType[P]> : Prisma.GetScalarType<T[P], MixGroupByOutputType[P]>;
}>>;
export type MixWhereInput = {
    AND?: Prisma.MixWhereInput | Prisma.MixWhereInput[];
    OR?: Prisma.MixWhereInput[];
    NOT?: Prisma.MixWhereInput | Prisma.MixWhereInput[];
    id?: Prisma.StringFilter<"Mix"> | string;
    title?: Prisma.StringFilter<"Mix"> | string;
    description?: Prisma.StringNullableFilter<"Mix"> | string | null;
    artist?: Prisma.StringNullableFilter<"Mix"> | string | null;
    audioUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceType?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceRef?: Prisma.StringNullableFilter<"Mix"> | string | null;
    coverUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    durationSec?: Prisma.IntNullableFilter<"Mix"> | number | null;
    playsCount?: Prisma.IntFilter<"Mix"> | number;
    tags?: Prisma.StringNullableListFilter<"Mix">;
    createdAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    userId?: Prisma.StringFilter<"Mix"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    tracklist?: Prisma.TracklistEntryListRelationFilter;
    favorites?: Prisma.FavoriteListRelationFilter;
    playHistory?: Prisma.PlayHistoryListRelationFilter;
    playlistItems?: Prisma.PlaylistItemListRelationFilter;
    comments?: Prisma.CommentListRelationFilter;
};
export type MixOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    artist?: Prisma.SortOrderInput | Prisma.SortOrder;
    audioUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    sourceType?: Prisma.SortOrderInput | Prisma.SortOrder;
    sourceRef?: Prisma.SortOrderInput | Prisma.SortOrder;
    coverUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    durationSec?: Prisma.SortOrderInput | Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
    tags?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    tracklist?: Prisma.TracklistEntryOrderByRelationAggregateInput;
    favorites?: Prisma.FavoriteOrderByRelationAggregateInput;
    playHistory?: Prisma.PlayHistoryOrderByRelationAggregateInput;
    playlistItems?: Prisma.PlaylistItemOrderByRelationAggregateInput;
    comments?: Prisma.CommentOrderByRelationAggregateInput;
};
export type MixWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.MixWhereInput | Prisma.MixWhereInput[];
    OR?: Prisma.MixWhereInput[];
    NOT?: Prisma.MixWhereInput | Prisma.MixWhereInput[];
    title?: Prisma.StringFilter<"Mix"> | string;
    description?: Prisma.StringNullableFilter<"Mix"> | string | null;
    artist?: Prisma.StringNullableFilter<"Mix"> | string | null;
    audioUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceType?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceRef?: Prisma.StringNullableFilter<"Mix"> | string | null;
    coverUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    durationSec?: Prisma.IntNullableFilter<"Mix"> | number | null;
    playsCount?: Prisma.IntFilter<"Mix"> | number;
    tags?: Prisma.StringNullableListFilter<"Mix">;
    createdAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    userId?: Prisma.StringFilter<"Mix"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    tracklist?: Prisma.TracklistEntryListRelationFilter;
    favorites?: Prisma.FavoriteListRelationFilter;
    playHistory?: Prisma.PlayHistoryListRelationFilter;
    playlistItems?: Prisma.PlaylistItemListRelationFilter;
    comments?: Prisma.CommentListRelationFilter;
}, "id">;
export type MixOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    artist?: Prisma.SortOrderInput | Prisma.SortOrder;
    audioUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    sourceType?: Prisma.SortOrderInput | Prisma.SortOrder;
    sourceRef?: Prisma.SortOrderInput | Prisma.SortOrder;
    coverUrl?: Prisma.SortOrderInput | Prisma.SortOrder;
    durationSec?: Prisma.SortOrderInput | Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
    tags?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    _count?: Prisma.MixCountOrderByAggregateInput;
    _avg?: Prisma.MixAvgOrderByAggregateInput;
    _max?: Prisma.MixMaxOrderByAggregateInput;
    _min?: Prisma.MixMinOrderByAggregateInput;
    _sum?: Prisma.MixSumOrderByAggregateInput;
};
export type MixScalarWhereWithAggregatesInput = {
    AND?: Prisma.MixScalarWhereWithAggregatesInput | Prisma.MixScalarWhereWithAggregatesInput[];
    OR?: Prisma.MixScalarWhereWithAggregatesInput[];
    NOT?: Prisma.MixScalarWhereWithAggregatesInput | Prisma.MixScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Mix"> | string;
    title?: Prisma.StringWithAggregatesFilter<"Mix"> | string;
    description?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    artist?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    audioUrl?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    sourceType?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    sourceRef?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    coverUrl?: Prisma.StringNullableWithAggregatesFilter<"Mix"> | string | null;
    durationSec?: Prisma.IntNullableWithAggregatesFilter<"Mix"> | number | null;
    playsCount?: Prisma.IntWithAggregatesFilter<"Mix"> | number;
    tags?: Prisma.StringNullableListFilter<"Mix">;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Mix"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"Mix"> | Date | string;
    userId?: Prisma.StringWithAggregatesFilter<"Mix"> | string;
};
export type MixCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateManyInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
};
export type MixUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MixUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type MixListRelationFilter = {
    every?: Prisma.MixWhereInput;
    some?: Prisma.MixWhereInput;
    none?: Prisma.MixWhereInput;
};
export type MixOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type StringNullableListFilter<$PrismaModel = never> = {
    equals?: string[] | Prisma.ListStringFieldRefInput<$PrismaModel> | null;
    has?: string | Prisma.StringFieldRefInput<$PrismaModel> | null;
    hasEvery?: string[] | Prisma.ListStringFieldRefInput<$PrismaModel>;
    hasSome?: string[] | Prisma.ListStringFieldRefInput<$PrismaModel>;
    isEmpty?: boolean;
};
export type MixCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    audioUrl?: Prisma.SortOrder;
    sourceType?: Prisma.SortOrder;
    sourceRef?: Prisma.SortOrder;
    coverUrl?: Prisma.SortOrder;
    durationSec?: Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
    tags?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type MixAvgOrderByAggregateInput = {
    durationSec?: Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
};
export type MixMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    audioUrl?: Prisma.SortOrder;
    sourceType?: Prisma.SortOrder;
    sourceRef?: Prisma.SortOrder;
    coverUrl?: Prisma.SortOrder;
    durationSec?: Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type MixMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    audioUrl?: Prisma.SortOrder;
    sourceType?: Prisma.SortOrder;
    sourceRef?: Prisma.SortOrder;
    coverUrl?: Prisma.SortOrder;
    durationSec?: Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type MixSumOrderByAggregateInput = {
    durationSec?: Prisma.SortOrder;
    playsCount?: Prisma.SortOrder;
};
export type MixScalarRelationFilter = {
    is?: Prisma.MixWhereInput;
    isNot?: Prisma.MixWhereInput;
};
export type MixCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput> | Prisma.MixCreateWithoutUserInput[] | Prisma.MixUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutUserInput | Prisma.MixCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.MixCreateManyUserInputEnvelope;
    connect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
};
export type MixUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput> | Prisma.MixCreateWithoutUserInput[] | Prisma.MixUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutUserInput | Prisma.MixCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.MixCreateManyUserInputEnvelope;
    connect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
};
export type MixUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput> | Prisma.MixCreateWithoutUserInput[] | Prisma.MixUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutUserInput | Prisma.MixCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.MixUpsertWithWhereUniqueWithoutUserInput | Prisma.MixUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.MixCreateManyUserInputEnvelope;
    set?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    disconnect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    delete?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    connect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    update?: Prisma.MixUpdateWithWhereUniqueWithoutUserInput | Prisma.MixUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.MixUpdateManyWithWhereWithoutUserInput | Prisma.MixUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.MixScalarWhereInput | Prisma.MixScalarWhereInput[];
};
export type MixUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput> | Prisma.MixCreateWithoutUserInput[] | Prisma.MixUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutUserInput | Prisma.MixCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.MixUpsertWithWhereUniqueWithoutUserInput | Prisma.MixUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.MixCreateManyUserInputEnvelope;
    set?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    disconnect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    delete?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    connect?: Prisma.MixWhereUniqueInput | Prisma.MixWhereUniqueInput[];
    update?: Prisma.MixUpdateWithWhereUniqueWithoutUserInput | Prisma.MixUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.MixUpdateManyWithWhereWithoutUserInput | Prisma.MixUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.MixScalarWhereInput | Prisma.MixScalarWhereInput[];
};
export type MixCreatetagsInput = {
    set: string[];
};
export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type IntFieldUpdateOperationsInput = {
    set?: number;
    increment?: number;
    decrement?: number;
    multiply?: number;
    divide?: number;
};
export type MixUpdatetagsInput = {
    set?: string[];
    push?: string | string[];
};
export type MixCreateNestedOneWithoutPlaylistItemsInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutPlaylistItemsInput, Prisma.MixUncheckedCreateWithoutPlaylistItemsInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutPlaylistItemsInput;
    connect?: Prisma.MixWhereUniqueInput;
};
export type MixUpdateOneRequiredWithoutPlaylistItemsNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutPlaylistItemsInput, Prisma.MixUncheckedCreateWithoutPlaylistItemsInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutPlaylistItemsInput;
    upsert?: Prisma.MixUpsertWithoutPlaylistItemsInput;
    connect?: Prisma.MixWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.MixUpdateToOneWithWhereWithoutPlaylistItemsInput, Prisma.MixUpdateWithoutPlaylistItemsInput>, Prisma.MixUncheckedUpdateWithoutPlaylistItemsInput>;
};
export type MixCreateNestedOneWithoutFavoritesInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutFavoritesInput, Prisma.MixUncheckedCreateWithoutFavoritesInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutFavoritesInput;
    connect?: Prisma.MixWhereUniqueInput;
};
export type MixUpdateOneRequiredWithoutFavoritesNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutFavoritesInput, Prisma.MixUncheckedCreateWithoutFavoritesInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutFavoritesInput;
    upsert?: Prisma.MixUpsertWithoutFavoritesInput;
    connect?: Prisma.MixWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.MixUpdateToOneWithWhereWithoutFavoritesInput, Prisma.MixUpdateWithoutFavoritesInput>, Prisma.MixUncheckedUpdateWithoutFavoritesInput>;
};
export type MixCreateNestedOneWithoutPlayHistoryInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutPlayHistoryInput, Prisma.MixUncheckedCreateWithoutPlayHistoryInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutPlayHistoryInput;
    connect?: Prisma.MixWhereUniqueInput;
};
export type MixUpdateOneRequiredWithoutPlayHistoryNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutPlayHistoryInput, Prisma.MixUncheckedCreateWithoutPlayHistoryInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutPlayHistoryInput;
    upsert?: Prisma.MixUpsertWithoutPlayHistoryInput;
    connect?: Prisma.MixWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.MixUpdateToOneWithWhereWithoutPlayHistoryInput, Prisma.MixUpdateWithoutPlayHistoryInput>, Prisma.MixUncheckedUpdateWithoutPlayHistoryInput>;
};
export type MixCreateNestedOneWithoutCommentsInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutCommentsInput, Prisma.MixUncheckedCreateWithoutCommentsInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutCommentsInput;
    connect?: Prisma.MixWhereUniqueInput;
};
export type MixUpdateOneRequiredWithoutCommentsNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutCommentsInput, Prisma.MixUncheckedCreateWithoutCommentsInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutCommentsInput;
    upsert?: Prisma.MixUpsertWithoutCommentsInput;
    connect?: Prisma.MixWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.MixUpdateToOneWithWhereWithoutCommentsInput, Prisma.MixUpdateWithoutCommentsInput>, Prisma.MixUncheckedUpdateWithoutCommentsInput>;
};
export type MixCreateNestedOneWithoutTracklistInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutTracklistInput, Prisma.MixUncheckedCreateWithoutTracklistInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutTracklistInput;
    connect?: Prisma.MixWhereUniqueInput;
};
export type MixUpdateOneRequiredWithoutTracklistNestedInput = {
    create?: Prisma.XOR<Prisma.MixCreateWithoutTracklistInput, Prisma.MixUncheckedCreateWithoutTracklistInput>;
    connectOrCreate?: Prisma.MixCreateOrConnectWithoutTracklistInput;
    upsert?: Prisma.MixUpsertWithoutTracklistInput;
    connect?: Prisma.MixWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.MixUpdateToOneWithWhereWithoutTracklistInput, Prisma.MixUpdateWithoutTracklistInput>, Prisma.MixUncheckedUpdateWithoutTracklistInput>;
};
export type MixCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutUserInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput>;
};
export type MixCreateManyUserInputEnvelope = {
    data: Prisma.MixCreateManyUserInput | Prisma.MixCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type MixUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.MixWhereUniqueInput;
    update: Prisma.XOR<Prisma.MixUpdateWithoutUserInput, Prisma.MixUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutUserInput, Prisma.MixUncheckedCreateWithoutUserInput>;
};
export type MixUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.MixWhereUniqueInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutUserInput, Prisma.MixUncheckedUpdateWithoutUserInput>;
};
export type MixUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.MixScalarWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateManyMutationInput, Prisma.MixUncheckedUpdateManyWithoutUserInput>;
};
export type MixScalarWhereInput = {
    AND?: Prisma.MixScalarWhereInput | Prisma.MixScalarWhereInput[];
    OR?: Prisma.MixScalarWhereInput[];
    NOT?: Prisma.MixScalarWhereInput | Prisma.MixScalarWhereInput[];
    id?: Prisma.StringFilter<"Mix"> | string;
    title?: Prisma.StringFilter<"Mix"> | string;
    description?: Prisma.StringNullableFilter<"Mix"> | string | null;
    artist?: Prisma.StringNullableFilter<"Mix"> | string | null;
    audioUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceType?: Prisma.StringNullableFilter<"Mix"> | string | null;
    sourceRef?: Prisma.StringNullableFilter<"Mix"> | string | null;
    coverUrl?: Prisma.StringNullableFilter<"Mix"> | string | null;
    durationSec?: Prisma.IntNullableFilter<"Mix"> | number | null;
    playsCount?: Prisma.IntFilter<"Mix"> | number;
    tags?: Prisma.StringNullableListFilter<"Mix">;
    createdAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Mix"> | Date | string;
    userId?: Prisma.StringFilter<"Mix"> | string;
};
export type MixCreateWithoutPlaylistItemsInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutPlaylistItemsInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutPlaylistItemsInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutPlaylistItemsInput, Prisma.MixUncheckedCreateWithoutPlaylistItemsInput>;
};
export type MixUpsertWithoutPlaylistItemsInput = {
    update: Prisma.XOR<Prisma.MixUpdateWithoutPlaylistItemsInput, Prisma.MixUncheckedUpdateWithoutPlaylistItemsInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutPlaylistItemsInput, Prisma.MixUncheckedCreateWithoutPlaylistItemsInput>;
    where?: Prisma.MixWhereInput;
};
export type MixUpdateToOneWithWhereWithoutPlaylistItemsInput = {
    where?: Prisma.MixWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutPlaylistItemsInput, Prisma.MixUncheckedUpdateWithoutPlaylistItemsInput>;
};
export type MixUpdateWithoutPlaylistItemsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutPlaylistItemsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateWithoutFavoritesInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutFavoritesInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutFavoritesInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutFavoritesInput, Prisma.MixUncheckedCreateWithoutFavoritesInput>;
};
export type MixUpsertWithoutFavoritesInput = {
    update: Prisma.XOR<Prisma.MixUpdateWithoutFavoritesInput, Prisma.MixUncheckedUpdateWithoutFavoritesInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutFavoritesInput, Prisma.MixUncheckedCreateWithoutFavoritesInput>;
    where?: Prisma.MixWhereInput;
};
export type MixUpdateToOneWithWhereWithoutFavoritesInput = {
    where?: Prisma.MixWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutFavoritesInput, Prisma.MixUncheckedUpdateWithoutFavoritesInput>;
};
export type MixUpdateWithoutFavoritesInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutFavoritesInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateWithoutPlayHistoryInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutPlayHistoryInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutPlayHistoryInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutPlayHistoryInput, Prisma.MixUncheckedCreateWithoutPlayHistoryInput>;
};
export type MixUpsertWithoutPlayHistoryInput = {
    update: Prisma.XOR<Prisma.MixUpdateWithoutPlayHistoryInput, Prisma.MixUncheckedUpdateWithoutPlayHistoryInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutPlayHistoryInput, Prisma.MixUncheckedCreateWithoutPlayHistoryInput>;
    where?: Prisma.MixWhereInput;
};
export type MixUpdateToOneWithWhereWithoutPlayHistoryInput = {
    where?: Prisma.MixWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutPlayHistoryInput, Prisma.MixUncheckedUpdateWithoutPlayHistoryInput>;
};
export type MixUpdateWithoutPlayHistoryInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutPlayHistoryInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateWithoutCommentsInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    tracklist?: Prisma.TracklistEntryCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutCommentsInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    tracklist?: Prisma.TracklistEntryUncheckedCreateNestedManyWithoutMixInput;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutCommentsInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutCommentsInput, Prisma.MixUncheckedCreateWithoutCommentsInput>;
};
export type MixUpsertWithoutCommentsInput = {
    update: Prisma.XOR<Prisma.MixUpdateWithoutCommentsInput, Prisma.MixUncheckedUpdateWithoutCommentsInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutCommentsInput, Prisma.MixUncheckedCreateWithoutCommentsInput>;
    where?: Prisma.MixWhereInput;
};
export type MixUpdateToOneWithWhereWithoutCommentsInput = {
    where?: Prisma.MixWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutCommentsInput, Prisma.MixUncheckedUpdateWithoutCommentsInput>;
};
export type MixUpdateWithoutCommentsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutCommentsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateWithoutTracklistInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutMixesInput;
    favorites?: Prisma.FavoriteCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentCreateNestedManyWithoutMixInput;
};
export type MixUncheckedCreateWithoutTracklistInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    favorites?: Prisma.FavoriteUncheckedCreateNestedManyWithoutMixInput;
    playHistory?: Prisma.PlayHistoryUncheckedCreateNestedManyWithoutMixInput;
    playlistItems?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutMixInput;
    comments?: Prisma.CommentUncheckedCreateNestedManyWithoutMixInput;
};
export type MixCreateOrConnectWithoutTracklistInput = {
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateWithoutTracklistInput, Prisma.MixUncheckedCreateWithoutTracklistInput>;
};
export type MixUpsertWithoutTracklistInput = {
    update: Prisma.XOR<Prisma.MixUpdateWithoutTracklistInput, Prisma.MixUncheckedUpdateWithoutTracklistInput>;
    create: Prisma.XOR<Prisma.MixCreateWithoutTracklistInput, Prisma.MixUncheckedCreateWithoutTracklistInput>;
    where?: Prisma.MixWhereInput;
};
export type MixUpdateToOneWithWhereWithoutTracklistInput = {
    where?: Prisma.MixWhereInput;
    data: Prisma.XOR<Prisma.MixUpdateWithoutTracklistInput, Prisma.MixUncheckedUpdateWithoutTracklistInput>;
};
export type MixUpdateWithoutTracklistInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutMixesNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutTracklistInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixCreateManyUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    artist?: string | null;
    audioUrl?: string | null;
    sourceType?: string | null;
    sourceRef?: string | null;
    coverUrl?: string | null;
    durationSec?: number | null;
    playsCount?: number;
    tags?: Prisma.MixCreatetagsInput | string[];
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type MixUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    tracklist?: Prisma.TracklistEntryUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    tracklist?: Prisma.TracklistEntryUncheckedUpdateManyWithoutMixNestedInput;
    favorites?: Prisma.FavoriteUncheckedUpdateManyWithoutMixNestedInput;
    playHistory?: Prisma.PlayHistoryUncheckedUpdateManyWithoutMixNestedInput;
    playlistItems?: Prisma.PlaylistItemUncheckedUpdateManyWithoutMixNestedInput;
    comments?: Prisma.CommentUncheckedUpdateManyWithoutMixNestedInput;
};
export type MixUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    artist?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    audioUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceType?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    sourceRef?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    coverUrl?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    durationSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    playsCount?: Prisma.IntFieldUpdateOperationsInput | number;
    tags?: Prisma.MixUpdatetagsInput | string[];
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type MixCountOutputType = {
    tracklist: number;
    favorites: number;
    playHistory: number;
    playlistItems: number;
    comments: number;
};
export type MixCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    tracklist?: boolean | MixCountOutputTypeCountTracklistArgs;
    favorites?: boolean | MixCountOutputTypeCountFavoritesArgs;
    playHistory?: boolean | MixCountOutputTypeCountPlayHistoryArgs;
    playlistItems?: boolean | MixCountOutputTypeCountPlaylistItemsArgs;
    comments?: boolean | MixCountOutputTypeCountCommentsArgs;
};
export type MixCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixCountOutputTypeSelect<ExtArgs> | null;
};
export type MixCountOutputTypeCountTracklistArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.TracklistEntryWhereInput;
};
export type MixCountOutputTypeCountFavoritesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.FavoriteWhereInput;
};
export type MixCountOutputTypeCountPlayHistoryArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlayHistoryWhereInput;
};
export type MixCountOutputTypeCountPlaylistItemsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistItemWhereInput;
};
export type MixCountOutputTypeCountCommentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CommentWhereInput;
};
export type MixSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    artist?: boolean;
    audioUrl?: boolean;
    sourceType?: boolean;
    sourceRef?: boolean;
    coverUrl?: boolean;
    durationSec?: boolean;
    playsCount?: boolean;
    tags?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    tracklist?: boolean | Prisma.Mix$tracklistArgs<ExtArgs>;
    favorites?: boolean | Prisma.Mix$favoritesArgs<ExtArgs>;
    playHistory?: boolean | Prisma.Mix$playHistoryArgs<ExtArgs>;
    playlistItems?: boolean | Prisma.Mix$playlistItemsArgs<ExtArgs>;
    comments?: boolean | Prisma.Mix$commentsArgs<ExtArgs>;
    _count?: boolean | Prisma.MixCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["mix"]>;
export type MixSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    artist?: boolean;
    audioUrl?: boolean;
    sourceType?: boolean;
    sourceRef?: boolean;
    coverUrl?: boolean;
    durationSec?: boolean;
    playsCount?: boolean;
    tags?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["mix"]>;
export type MixSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    artist?: boolean;
    audioUrl?: boolean;
    sourceType?: boolean;
    sourceRef?: boolean;
    coverUrl?: boolean;
    durationSec?: boolean;
    playsCount?: boolean;
    tags?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["mix"]>;
export type MixSelectScalar = {
    id?: boolean;
    title?: boolean;
    description?: boolean;
    artist?: boolean;
    audioUrl?: boolean;
    sourceType?: boolean;
    sourceRef?: boolean;
    coverUrl?: boolean;
    durationSec?: boolean;
    playsCount?: boolean;
    tags?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
};
export type MixOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "title" | "description" | "artist" | "audioUrl" | "sourceType" | "sourceRef" | "coverUrl" | "durationSec" | "playsCount" | "tags" | "createdAt" | "updatedAt" | "userId", ExtArgs["result"]["mix"]>;
export type MixInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    tracklist?: boolean | Prisma.Mix$tracklistArgs<ExtArgs>;
    favorites?: boolean | Prisma.Mix$favoritesArgs<ExtArgs>;
    playHistory?: boolean | Prisma.Mix$playHistoryArgs<ExtArgs>;
    playlistItems?: boolean | Prisma.Mix$playlistItemsArgs<ExtArgs>;
    comments?: boolean | Prisma.Mix$commentsArgs<ExtArgs>;
    _count?: boolean | Prisma.MixCountOutputTypeDefaultArgs<ExtArgs>;
};
export type MixIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type MixIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $MixPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Mix";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        tracklist: Prisma.$TracklistEntryPayload<ExtArgs>[];
        favorites: Prisma.$FavoritePayload<ExtArgs>[];
        playHistory: Prisma.$PlayHistoryPayload<ExtArgs>[];
        playlistItems: Prisma.$PlaylistItemPayload<ExtArgs>[];
        comments: Prisma.$CommentPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        title: string;
        description: string | null;
        artist: string | null;
        audioUrl: string | null;
        sourceType: string | null;
        sourceRef: string | null;
        coverUrl: string | null;
        durationSec: number | null;
        playsCount: number;
        tags: string[];
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }, ExtArgs["result"]["mix"]>;
    composites: {};
};
export type MixGetPayload<S extends boolean | null | undefined | MixDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$MixPayload, S>;
export type MixCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<MixFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: MixCountAggregateInputType | true;
};
export interface MixDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Mix'];
        meta: {
            name: 'Mix';
        };
    };
    findUnique<T extends MixFindUniqueArgs>(args: Prisma.SelectSubset<T, MixFindUniqueArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends MixFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, MixFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends MixFindFirstArgs>(args?: Prisma.SelectSubset<T, MixFindFirstArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends MixFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, MixFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends MixFindManyArgs>(args?: Prisma.SelectSubset<T, MixFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends MixCreateArgs>(args: Prisma.SelectSubset<T, MixCreateArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends MixCreateManyArgs>(args?: Prisma.SelectSubset<T, MixCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends MixCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, MixCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends MixDeleteArgs>(args: Prisma.SelectSubset<T, MixDeleteArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends MixUpdateArgs>(args: Prisma.SelectSubset<T, MixUpdateArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends MixDeleteManyArgs>(args?: Prisma.SelectSubset<T, MixDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends MixUpdateManyArgs>(args: Prisma.SelectSubset<T, MixUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends MixUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, MixUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends MixUpsertArgs>(args: Prisma.SelectSubset<T, MixUpsertArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends MixCountArgs>(args?: Prisma.Subset<T, MixCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], MixCountAggregateOutputType> : number>;
    aggregate<T extends MixAggregateArgs>(args: Prisma.Subset<T, MixAggregateArgs>): Prisma.PrismaPromise<GetMixAggregateType<T>>;
    groupBy<T extends MixGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: MixGroupByArgs['orderBy'];
    } : {
        orderBy?: MixGroupByArgs['orderBy'];
    }, OrderFields extends Prisma.ExcludeUnderscoreKeys<Prisma.Keys<Prisma.MaybeTupleToUnion<T['orderBy']>>>, ByFields extends Prisma.MaybeTupleToUnion<T['by']>, ByValid extends Prisma.Has<ByFields, OrderFields>, HavingFields extends Prisma.GetHavingFields<T['having']>, HavingValid extends Prisma.Has<ByFields, HavingFields>, ByEmpty extends T['by'] extends never[] ? Prisma.True : Prisma.False, InputErrors extends ByEmpty extends Prisma.True ? `Error: "by" must not be empty.` : HavingValid extends Prisma.False ? {
        [P in HavingFields]: P extends ByFields ? never : P extends string ? `Error: Field "${P}" used in "having" needs to be provided in "by".` : [
            Error,
            'Field ',
            P,
            ` in "having" needs to be provided in "by"`
        ];
    }[HavingFields] : 'take' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "take", you also need to provide "orderBy"' : 'skip' extends Prisma.Keys<T> ? 'orderBy' extends Prisma.Keys<T> ? ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields] : 'Error: If you provide "skip", you also need to provide "orderBy"' : ByValid extends Prisma.True ? {} : {
        [P in OrderFields]: P extends ByFields ? never : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`;
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, MixGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetMixGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: MixFieldRefs;
}
export interface Prisma__MixClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    tracklist<T extends Prisma.Mix$tracklistArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Mix$tracklistArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    favorites<T extends Prisma.Mix$favoritesArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Mix$favoritesArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    playHistory<T extends Prisma.Mix$playHistoryArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Mix$playHistoryArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    playlistItems<T extends Prisma.Mix$playlistItemsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Mix$playlistItemsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    comments<T extends Prisma.Mix$commentsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Mix$commentsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface MixFieldRefs {
    readonly id: Prisma.FieldRef<"Mix", 'String'>;
    readonly title: Prisma.FieldRef<"Mix", 'String'>;
    readonly description: Prisma.FieldRef<"Mix", 'String'>;
    readonly artist: Prisma.FieldRef<"Mix", 'String'>;
    readonly audioUrl: Prisma.FieldRef<"Mix", 'String'>;
    readonly sourceType: Prisma.FieldRef<"Mix", 'String'>;
    readonly sourceRef: Prisma.FieldRef<"Mix", 'String'>;
    readonly coverUrl: Prisma.FieldRef<"Mix", 'String'>;
    readonly durationSec: Prisma.FieldRef<"Mix", 'Int'>;
    readonly playsCount: Prisma.FieldRef<"Mix", 'Int'>;
    readonly tags: Prisma.FieldRef<"Mix", 'String[]'>;
    readonly createdAt: Prisma.FieldRef<"Mix", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"Mix", 'DateTime'>;
    readonly userId: Prisma.FieldRef<"Mix", 'String'>;
}
export type MixFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where: Prisma.MixWhereUniqueInput;
};
export type MixFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where: Prisma.MixWhereUniqueInput;
};
export type MixFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where?: Prisma.MixWhereInput;
    orderBy?: Prisma.MixOrderByWithRelationInput | Prisma.MixOrderByWithRelationInput[];
    cursor?: Prisma.MixWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.MixScalarFieldEnum | Prisma.MixScalarFieldEnum[];
};
export type MixFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where?: Prisma.MixWhereInput;
    orderBy?: Prisma.MixOrderByWithRelationInput | Prisma.MixOrderByWithRelationInput[];
    cursor?: Prisma.MixWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.MixScalarFieldEnum | Prisma.MixScalarFieldEnum[];
};
export type MixFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where?: Prisma.MixWhereInput;
    orderBy?: Prisma.MixOrderByWithRelationInput | Prisma.MixOrderByWithRelationInput[];
    cursor?: Prisma.MixWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.MixScalarFieldEnum | Prisma.MixScalarFieldEnum[];
};
export type MixCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.MixCreateInput, Prisma.MixUncheckedCreateInput>;
};
export type MixCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.MixCreateManyInput | Prisma.MixCreateManyInput[];
    skipDuplicates?: boolean;
};
export type MixCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    data: Prisma.MixCreateManyInput | Prisma.MixCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.MixIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type MixUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.MixUpdateInput, Prisma.MixUncheckedUpdateInput>;
    where: Prisma.MixWhereUniqueInput;
};
export type MixUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.MixUpdateManyMutationInput, Prisma.MixUncheckedUpdateManyInput>;
    where?: Prisma.MixWhereInput;
    limit?: number;
};
export type MixUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.MixUpdateManyMutationInput, Prisma.MixUncheckedUpdateManyInput>;
    where?: Prisma.MixWhereInput;
    limit?: number;
    include?: Prisma.MixIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type MixUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where: Prisma.MixWhereUniqueInput;
    create: Prisma.XOR<Prisma.MixCreateInput, Prisma.MixUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.MixUpdateInput, Prisma.MixUncheckedUpdateInput>;
};
export type MixDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
    where: Prisma.MixWhereUniqueInput;
};
export type MixDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.MixWhereInput;
    limit?: number;
};
export type Mix$tracklistArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    where?: Prisma.TracklistEntryWhereInput;
    orderBy?: Prisma.TracklistEntryOrderByWithRelationInput | Prisma.TracklistEntryOrderByWithRelationInput[];
    cursor?: Prisma.TracklistEntryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.TracklistEntryScalarFieldEnum | Prisma.TracklistEntryScalarFieldEnum[];
};
export type Mix$favoritesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    where?: Prisma.FavoriteWhereInput;
    orderBy?: Prisma.FavoriteOrderByWithRelationInput | Prisma.FavoriteOrderByWithRelationInput[];
    cursor?: Prisma.FavoriteWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.FavoriteScalarFieldEnum | Prisma.FavoriteScalarFieldEnum[];
};
export type Mix$playHistoryArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    where?: Prisma.PlayHistoryWhereInput;
    orderBy?: Prisma.PlayHistoryOrderByWithRelationInput | Prisma.PlayHistoryOrderByWithRelationInput[];
    cursor?: Prisma.PlayHistoryWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PlayHistoryScalarFieldEnum | Prisma.PlayHistoryScalarFieldEnum[];
};
export type Mix$playlistItemsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    where?: Prisma.PlaylistItemWhereInput;
    orderBy?: Prisma.PlaylistItemOrderByWithRelationInput | Prisma.PlaylistItemOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistItemWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PlaylistItemScalarFieldEnum | Prisma.PlaylistItemScalarFieldEnum[];
};
export type Mix$commentsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where?: Prisma.CommentWhereInput;
    orderBy?: Prisma.CommentOrderByWithRelationInput | Prisma.CommentOrderByWithRelationInput[];
    cursor?: Prisma.CommentWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.CommentScalarFieldEnum | Prisma.CommentScalarFieldEnum[];
};
export type MixDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.MixSelect<ExtArgs> | null;
    omit?: Prisma.MixOmit<ExtArgs> | null;
    include?: Prisma.MixInclude<ExtArgs> | null;
};
