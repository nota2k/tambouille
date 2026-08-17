import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type PlaylistItemModel = runtime.Types.Result.DefaultSelection<Prisma.$PlaylistItemPayload>;
export type AggregatePlaylistItem = {
    _count: PlaylistItemCountAggregateOutputType | null;
    _avg: PlaylistItemAvgAggregateOutputType | null;
    _sum: PlaylistItemSumAggregateOutputType | null;
    _min: PlaylistItemMinAggregateOutputType | null;
    _max: PlaylistItemMaxAggregateOutputType | null;
};
export type PlaylistItemAvgAggregateOutputType = {
    position: number | null;
};
export type PlaylistItemSumAggregateOutputType = {
    position: number | null;
};
export type PlaylistItemMinAggregateOutputType = {
    id: string | null;
    position: number | null;
    addedAt: Date | null;
    playlistId: string | null;
    mixId: string | null;
};
export type PlaylistItemMaxAggregateOutputType = {
    id: string | null;
    position: number | null;
    addedAt: Date | null;
    playlistId: string | null;
    mixId: string | null;
};
export type PlaylistItemCountAggregateOutputType = {
    id: number;
    position: number;
    addedAt: number;
    playlistId: number;
    mixId: number;
    _all: number;
};
export type PlaylistItemAvgAggregateInputType = {
    position?: true;
};
export type PlaylistItemSumAggregateInputType = {
    position?: true;
};
export type PlaylistItemMinAggregateInputType = {
    id?: true;
    position?: true;
    addedAt?: true;
    playlistId?: true;
    mixId?: true;
};
export type PlaylistItemMaxAggregateInputType = {
    id?: true;
    position?: true;
    addedAt?: true;
    playlistId?: true;
    mixId?: true;
};
export type PlaylistItemCountAggregateInputType = {
    id?: true;
    position?: true;
    addedAt?: true;
    playlistId?: true;
    mixId?: true;
    _all?: true;
};
export type PlaylistItemAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistItemWhereInput;
    orderBy?: Prisma.PlaylistItemOrderByWithRelationInput | Prisma.PlaylistItemOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistItemWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | PlaylistItemCountAggregateInputType;
    _avg?: PlaylistItemAvgAggregateInputType;
    _sum?: PlaylistItemSumAggregateInputType;
    _min?: PlaylistItemMinAggregateInputType;
    _max?: PlaylistItemMaxAggregateInputType;
};
export type GetPlaylistItemAggregateType<T extends PlaylistItemAggregateArgs> = {
    [P in keyof T & keyof AggregatePlaylistItem]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregatePlaylistItem[P]> : Prisma.GetScalarType<T[P], AggregatePlaylistItem[P]>;
};
export type PlaylistItemGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistItemWhereInput;
    orderBy?: Prisma.PlaylistItemOrderByWithAggregationInput | Prisma.PlaylistItemOrderByWithAggregationInput[];
    by: Prisma.PlaylistItemScalarFieldEnum[] | Prisma.PlaylistItemScalarFieldEnum;
    having?: Prisma.PlaylistItemScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: PlaylistItemCountAggregateInputType | true;
    _avg?: PlaylistItemAvgAggregateInputType;
    _sum?: PlaylistItemSumAggregateInputType;
    _min?: PlaylistItemMinAggregateInputType;
    _max?: PlaylistItemMaxAggregateInputType;
};
export type PlaylistItemGroupByOutputType = {
    id: string;
    position: number;
    addedAt: Date;
    playlistId: string;
    mixId: string;
    _count: PlaylistItemCountAggregateOutputType | null;
    _avg: PlaylistItemAvgAggregateOutputType | null;
    _sum: PlaylistItemSumAggregateOutputType | null;
    _min: PlaylistItemMinAggregateOutputType | null;
    _max: PlaylistItemMaxAggregateOutputType | null;
};
export type GetPlaylistItemGroupByPayload<T extends PlaylistItemGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<PlaylistItemGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof PlaylistItemGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], PlaylistItemGroupByOutputType[P]> : Prisma.GetScalarType<T[P], PlaylistItemGroupByOutputType[P]>;
}>>;
export type PlaylistItemWhereInput = {
    AND?: Prisma.PlaylistItemWhereInput | Prisma.PlaylistItemWhereInput[];
    OR?: Prisma.PlaylistItemWhereInput[];
    NOT?: Prisma.PlaylistItemWhereInput | Prisma.PlaylistItemWhereInput[];
    id?: Prisma.StringFilter<"PlaylistItem"> | string;
    position?: Prisma.IntFilter<"PlaylistItem"> | number;
    addedAt?: Prisma.DateTimeFilter<"PlaylistItem"> | Date | string;
    playlistId?: Prisma.StringFilter<"PlaylistItem"> | string;
    mixId?: Prisma.StringFilter<"PlaylistItem"> | string;
    playlist?: Prisma.XOR<Prisma.PlaylistScalarRelationFilter, Prisma.PlaylistWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
};
export type PlaylistItemOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    addedAt?: Prisma.SortOrder;
    playlistId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    playlist?: Prisma.PlaylistOrderByWithRelationInput;
    mix?: Prisma.MixOrderByWithRelationInput;
};
export type PlaylistItemWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    playlistId_mixId?: Prisma.PlaylistItemPlaylistIdMixIdCompoundUniqueInput;
    AND?: Prisma.PlaylistItemWhereInput | Prisma.PlaylistItemWhereInput[];
    OR?: Prisma.PlaylistItemWhereInput[];
    NOT?: Prisma.PlaylistItemWhereInput | Prisma.PlaylistItemWhereInput[];
    position?: Prisma.IntFilter<"PlaylistItem"> | number;
    addedAt?: Prisma.DateTimeFilter<"PlaylistItem"> | Date | string;
    playlistId?: Prisma.StringFilter<"PlaylistItem"> | string;
    mixId?: Prisma.StringFilter<"PlaylistItem"> | string;
    playlist?: Prisma.XOR<Prisma.PlaylistScalarRelationFilter, Prisma.PlaylistWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
}, "id" | "playlistId_mixId">;
export type PlaylistItemOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    addedAt?: Prisma.SortOrder;
    playlistId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    _count?: Prisma.PlaylistItemCountOrderByAggregateInput;
    _avg?: Prisma.PlaylistItemAvgOrderByAggregateInput;
    _max?: Prisma.PlaylistItemMaxOrderByAggregateInput;
    _min?: Prisma.PlaylistItemMinOrderByAggregateInput;
    _sum?: Prisma.PlaylistItemSumOrderByAggregateInput;
};
export type PlaylistItemScalarWhereWithAggregatesInput = {
    AND?: Prisma.PlaylistItemScalarWhereWithAggregatesInput | Prisma.PlaylistItemScalarWhereWithAggregatesInput[];
    OR?: Prisma.PlaylistItemScalarWhereWithAggregatesInput[];
    NOT?: Prisma.PlaylistItemScalarWhereWithAggregatesInput | Prisma.PlaylistItemScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"PlaylistItem"> | string;
    position?: Prisma.IntWithAggregatesFilter<"PlaylistItem"> | number;
    addedAt?: Prisma.DateTimeWithAggregatesFilter<"PlaylistItem"> | Date | string;
    playlistId?: Prisma.StringWithAggregatesFilter<"PlaylistItem"> | string;
    mixId?: Prisma.StringWithAggregatesFilter<"PlaylistItem"> | string;
};
export type PlaylistItemCreateInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlist: Prisma.PlaylistCreateNestedOneWithoutItemsInput;
    mix: Prisma.MixCreateNestedOneWithoutPlaylistItemsInput;
};
export type PlaylistItemUncheckedCreateInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlistId: string;
    mixId: string;
};
export type PlaylistItemUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlist?: Prisma.PlaylistUpdateOneRequiredWithoutItemsNestedInput;
    mix?: Prisma.MixUpdateOneRequiredWithoutPlaylistItemsNestedInput;
};
export type PlaylistItemUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlistId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemCreateManyInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlistId: string;
    mixId: string;
};
export type PlaylistItemUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PlaylistItemUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlistId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemListRelationFilter = {
    every?: Prisma.PlaylistItemWhereInput;
    some?: Prisma.PlaylistItemWhereInput;
    none?: Prisma.PlaylistItemWhereInput;
};
export type PlaylistItemOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type PlaylistItemPlaylistIdMixIdCompoundUniqueInput = {
    playlistId: string;
    mixId: string;
};
export type PlaylistItemCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    addedAt?: Prisma.SortOrder;
    playlistId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlaylistItemAvgOrderByAggregateInput = {
    position?: Prisma.SortOrder;
};
export type PlaylistItemMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    addedAt?: Prisma.SortOrder;
    playlistId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlaylistItemMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    addedAt?: Prisma.SortOrder;
    playlistId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlaylistItemSumOrderByAggregateInput = {
    position?: Prisma.SortOrder;
};
export type PlaylistItemCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput> | Prisma.PlaylistItemCreateWithoutMixInput[] | Prisma.PlaylistItemUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutMixInput | Prisma.PlaylistItemCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.PlaylistItemCreateManyMixInputEnvelope;
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
};
export type PlaylistItemUncheckedCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput> | Prisma.PlaylistItemCreateWithoutMixInput[] | Prisma.PlaylistItemUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutMixInput | Prisma.PlaylistItemCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.PlaylistItemCreateManyMixInputEnvelope;
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
};
export type PlaylistItemUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput> | Prisma.PlaylistItemCreateWithoutMixInput[] | Prisma.PlaylistItemUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutMixInput | Prisma.PlaylistItemCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.PlaylistItemUpsertWithWhereUniqueWithoutMixInput | Prisma.PlaylistItemUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.PlaylistItemCreateManyMixInputEnvelope;
    set?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    disconnect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    delete?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    update?: Prisma.PlaylistItemUpdateWithWhereUniqueWithoutMixInput | Prisma.PlaylistItemUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.PlaylistItemUpdateManyWithWhereWithoutMixInput | Prisma.PlaylistItemUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
};
export type PlaylistItemUncheckedUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput> | Prisma.PlaylistItemCreateWithoutMixInput[] | Prisma.PlaylistItemUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutMixInput | Prisma.PlaylistItemCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.PlaylistItemUpsertWithWhereUniqueWithoutMixInput | Prisma.PlaylistItemUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.PlaylistItemCreateManyMixInputEnvelope;
    set?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    disconnect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    delete?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    update?: Prisma.PlaylistItemUpdateWithWhereUniqueWithoutMixInput | Prisma.PlaylistItemUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.PlaylistItemUpdateManyWithWhereWithoutMixInput | Prisma.PlaylistItemUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
};
export type PlaylistItemCreateNestedManyWithoutPlaylistInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput> | Prisma.PlaylistItemCreateWithoutPlaylistInput[] | Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput | Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput[];
    createMany?: Prisma.PlaylistItemCreateManyPlaylistInputEnvelope;
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
};
export type PlaylistItemUncheckedCreateNestedManyWithoutPlaylistInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput> | Prisma.PlaylistItemCreateWithoutPlaylistInput[] | Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput | Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput[];
    createMany?: Prisma.PlaylistItemCreateManyPlaylistInputEnvelope;
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
};
export type PlaylistItemUpdateManyWithoutPlaylistNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput> | Prisma.PlaylistItemCreateWithoutPlaylistInput[] | Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput | Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput[];
    upsert?: Prisma.PlaylistItemUpsertWithWhereUniqueWithoutPlaylistInput | Prisma.PlaylistItemUpsertWithWhereUniqueWithoutPlaylistInput[];
    createMany?: Prisma.PlaylistItemCreateManyPlaylistInputEnvelope;
    set?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    disconnect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    delete?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    update?: Prisma.PlaylistItemUpdateWithWhereUniqueWithoutPlaylistInput | Prisma.PlaylistItemUpdateWithWhereUniqueWithoutPlaylistInput[];
    updateMany?: Prisma.PlaylistItemUpdateManyWithWhereWithoutPlaylistInput | Prisma.PlaylistItemUpdateManyWithWhereWithoutPlaylistInput[];
    deleteMany?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
};
export type PlaylistItemUncheckedUpdateManyWithoutPlaylistNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput> | Prisma.PlaylistItemCreateWithoutPlaylistInput[] | Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput[];
    connectOrCreate?: Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput | Prisma.PlaylistItemCreateOrConnectWithoutPlaylistInput[];
    upsert?: Prisma.PlaylistItemUpsertWithWhereUniqueWithoutPlaylistInput | Prisma.PlaylistItemUpsertWithWhereUniqueWithoutPlaylistInput[];
    createMany?: Prisma.PlaylistItemCreateManyPlaylistInputEnvelope;
    set?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    disconnect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    delete?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    connect?: Prisma.PlaylistItemWhereUniqueInput | Prisma.PlaylistItemWhereUniqueInput[];
    update?: Prisma.PlaylistItemUpdateWithWhereUniqueWithoutPlaylistInput | Prisma.PlaylistItemUpdateWithWhereUniqueWithoutPlaylistInput[];
    updateMany?: Prisma.PlaylistItemUpdateManyWithWhereWithoutPlaylistInput | Prisma.PlaylistItemUpdateManyWithWhereWithoutPlaylistInput[];
    deleteMany?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
};
export type PlaylistItemCreateWithoutMixInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlist: Prisma.PlaylistCreateNestedOneWithoutItemsInput;
};
export type PlaylistItemUncheckedCreateWithoutMixInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlistId: string;
};
export type PlaylistItemCreateOrConnectWithoutMixInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput>;
};
export type PlaylistItemCreateManyMixInputEnvelope = {
    data: Prisma.PlaylistItemCreateManyMixInput | Prisma.PlaylistItemCreateManyMixInput[];
    skipDuplicates?: boolean;
};
export type PlaylistItemUpsertWithWhereUniqueWithoutMixInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    update: Prisma.XOR<Prisma.PlaylistItemUpdateWithoutMixInput, Prisma.PlaylistItemUncheckedUpdateWithoutMixInput>;
    create: Prisma.XOR<Prisma.PlaylistItemCreateWithoutMixInput, Prisma.PlaylistItemUncheckedCreateWithoutMixInput>;
};
export type PlaylistItemUpdateWithWhereUniqueWithoutMixInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateWithoutMixInput, Prisma.PlaylistItemUncheckedUpdateWithoutMixInput>;
};
export type PlaylistItemUpdateManyWithWhereWithoutMixInput = {
    where: Prisma.PlaylistItemScalarWhereInput;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateManyMutationInput, Prisma.PlaylistItemUncheckedUpdateManyWithoutMixInput>;
};
export type PlaylistItemScalarWhereInput = {
    AND?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
    OR?: Prisma.PlaylistItemScalarWhereInput[];
    NOT?: Prisma.PlaylistItemScalarWhereInput | Prisma.PlaylistItemScalarWhereInput[];
    id?: Prisma.StringFilter<"PlaylistItem"> | string;
    position?: Prisma.IntFilter<"PlaylistItem"> | number;
    addedAt?: Prisma.DateTimeFilter<"PlaylistItem"> | Date | string;
    playlistId?: Prisma.StringFilter<"PlaylistItem"> | string;
    mixId?: Prisma.StringFilter<"PlaylistItem"> | string;
};
export type PlaylistItemCreateWithoutPlaylistInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutPlaylistItemsInput;
};
export type PlaylistItemUncheckedCreateWithoutPlaylistInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    mixId: string;
};
export type PlaylistItemCreateOrConnectWithoutPlaylistInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput>;
};
export type PlaylistItemCreateManyPlaylistInputEnvelope = {
    data: Prisma.PlaylistItemCreateManyPlaylistInput | Prisma.PlaylistItemCreateManyPlaylistInput[];
    skipDuplicates?: boolean;
};
export type PlaylistItemUpsertWithWhereUniqueWithoutPlaylistInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    update: Prisma.XOR<Prisma.PlaylistItemUpdateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedUpdateWithoutPlaylistInput>;
    create: Prisma.XOR<Prisma.PlaylistItemCreateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedCreateWithoutPlaylistInput>;
};
export type PlaylistItemUpdateWithWhereUniqueWithoutPlaylistInput = {
    where: Prisma.PlaylistItemWhereUniqueInput;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateWithoutPlaylistInput, Prisma.PlaylistItemUncheckedUpdateWithoutPlaylistInput>;
};
export type PlaylistItemUpdateManyWithWhereWithoutPlaylistInput = {
    where: Prisma.PlaylistItemScalarWhereInput;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateManyMutationInput, Prisma.PlaylistItemUncheckedUpdateManyWithoutPlaylistInput>;
};
export type PlaylistItemCreateManyMixInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    playlistId: string;
};
export type PlaylistItemUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlist?: Prisma.PlaylistUpdateOneRequiredWithoutItemsNestedInput;
};
export type PlaylistItemUncheckedUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlistId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemUncheckedUpdateManyWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    playlistId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemCreateManyPlaylistInput = {
    id?: string;
    position: number;
    addedAt?: Date | string;
    mixId: string;
};
export type PlaylistItemUpdateWithoutPlaylistInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutPlaylistItemsNestedInput;
};
export type PlaylistItemUncheckedUpdateWithoutPlaylistInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemUncheckedUpdateManyWithoutPlaylistInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    addedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistItemSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    position?: boolean;
    addedAt?: boolean;
    playlistId?: boolean;
    mixId?: boolean;
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlistItem"]>;
export type PlaylistItemSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    position?: boolean;
    addedAt?: boolean;
    playlistId?: boolean;
    mixId?: boolean;
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlistItem"]>;
export type PlaylistItemSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    position?: boolean;
    addedAt?: boolean;
    playlistId?: boolean;
    mixId?: boolean;
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlistItem"]>;
export type PlaylistItemSelectScalar = {
    id?: boolean;
    position?: boolean;
    addedAt?: boolean;
    playlistId?: boolean;
    mixId?: boolean;
};
export type PlaylistItemOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "position" | "addedAt" | "playlistId" | "mixId", ExtArgs["result"]["playlistItem"]>;
export type PlaylistItemInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type PlaylistItemIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type PlaylistItemIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    playlist?: boolean | Prisma.PlaylistDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type $PlaylistItemPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "PlaylistItem";
    objects: {
        playlist: Prisma.$PlaylistPayload<ExtArgs>;
        mix: Prisma.$MixPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        position: number;
        addedAt: Date;
        playlistId: string;
        mixId: string;
    }, ExtArgs["result"]["playlistItem"]>;
    composites: {};
};
export type PlaylistItemGetPayload<S extends boolean | null | undefined | PlaylistItemDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload, S>;
export type PlaylistItemCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<PlaylistItemFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: PlaylistItemCountAggregateInputType | true;
};
export interface PlaylistItemDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['PlaylistItem'];
        meta: {
            name: 'PlaylistItem';
        };
    };
    findUnique<T extends PlaylistItemFindUniqueArgs>(args: Prisma.SelectSubset<T, PlaylistItemFindUniqueArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends PlaylistItemFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, PlaylistItemFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends PlaylistItemFindFirstArgs>(args?: Prisma.SelectSubset<T, PlaylistItemFindFirstArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends PlaylistItemFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, PlaylistItemFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends PlaylistItemFindManyArgs>(args?: Prisma.SelectSubset<T, PlaylistItemFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends PlaylistItemCreateArgs>(args: Prisma.SelectSubset<T, PlaylistItemCreateArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends PlaylistItemCreateManyArgs>(args?: Prisma.SelectSubset<T, PlaylistItemCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends PlaylistItemCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, PlaylistItemCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends PlaylistItemDeleteArgs>(args: Prisma.SelectSubset<T, PlaylistItemDeleteArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends PlaylistItemUpdateArgs>(args: Prisma.SelectSubset<T, PlaylistItemUpdateArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends PlaylistItemDeleteManyArgs>(args?: Prisma.SelectSubset<T, PlaylistItemDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends PlaylistItemUpdateManyArgs>(args: Prisma.SelectSubset<T, PlaylistItemUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends PlaylistItemUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, PlaylistItemUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends PlaylistItemUpsertArgs>(args: Prisma.SelectSubset<T, PlaylistItemUpsertArgs<ExtArgs>>): Prisma.Prisma__PlaylistItemClient<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends PlaylistItemCountArgs>(args?: Prisma.Subset<T, PlaylistItemCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], PlaylistItemCountAggregateOutputType> : number>;
    aggregate<T extends PlaylistItemAggregateArgs>(args: Prisma.Subset<T, PlaylistItemAggregateArgs>): Prisma.PrismaPromise<GetPlaylistItemAggregateType<T>>;
    groupBy<T extends PlaylistItemGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: PlaylistItemGroupByArgs['orderBy'];
    } : {
        orderBy?: PlaylistItemGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, PlaylistItemGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlaylistItemGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: PlaylistItemFieldRefs;
}
export interface Prisma__PlaylistItemClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    playlist<T extends Prisma.PlaylistDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.PlaylistDefaultArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    mix<T extends Prisma.MixDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.MixDefaultArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface PlaylistItemFieldRefs {
    readonly id: Prisma.FieldRef<"PlaylistItem", 'String'>;
    readonly position: Prisma.FieldRef<"PlaylistItem", 'Int'>;
    readonly addedAt: Prisma.FieldRef<"PlaylistItem", 'DateTime'>;
    readonly playlistId: Prisma.FieldRef<"PlaylistItem", 'String'>;
    readonly mixId: Prisma.FieldRef<"PlaylistItem", 'String'>;
}
export type PlaylistItemFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    where: Prisma.PlaylistItemWhereUniqueInput;
};
export type PlaylistItemFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    where: Prisma.PlaylistItemWhereUniqueInput;
};
export type PlaylistItemFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlaylistItemFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlaylistItemFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlaylistItemCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistItemCreateInput, Prisma.PlaylistItemUncheckedCreateInput>;
};
export type PlaylistItemCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.PlaylistItemCreateManyInput | Prisma.PlaylistItemCreateManyInput[];
    skipDuplicates?: boolean;
};
export type PlaylistItemCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    data: Prisma.PlaylistItemCreateManyInput | Prisma.PlaylistItemCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.PlaylistItemIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type PlaylistItemUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateInput, Prisma.PlaylistItemUncheckedUpdateInput>;
    where: Prisma.PlaylistItemWhereUniqueInput;
};
export type PlaylistItemUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.PlaylistItemUpdateManyMutationInput, Prisma.PlaylistItemUncheckedUpdateManyInput>;
    where?: Prisma.PlaylistItemWhereInput;
    limit?: number;
};
export type PlaylistItemUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistItemUpdateManyMutationInput, Prisma.PlaylistItemUncheckedUpdateManyInput>;
    where?: Prisma.PlaylistItemWhereInput;
    limit?: number;
    include?: Prisma.PlaylistItemIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type PlaylistItemUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    where: Prisma.PlaylistItemWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistItemCreateInput, Prisma.PlaylistItemUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.PlaylistItemUpdateInput, Prisma.PlaylistItemUncheckedUpdateInput>;
};
export type PlaylistItemDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
    where: Prisma.PlaylistItemWhereUniqueInput;
};
export type PlaylistItemDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistItemWhereInput;
    limit?: number;
};
export type PlaylistItemDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistItemSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistItemOmit<ExtArgs> | null;
    include?: Prisma.PlaylistItemInclude<ExtArgs> | null;
};
