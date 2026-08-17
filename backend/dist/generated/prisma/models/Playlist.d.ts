import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type PlaylistModel = runtime.Types.Result.DefaultSelection<Prisma.$PlaylistPayload>;
export type AggregatePlaylist = {
    _count: PlaylistCountAggregateOutputType | null;
    _min: PlaylistMinAggregateOutputType | null;
    _max: PlaylistMaxAggregateOutputType | null;
};
export type PlaylistMinAggregateOutputType = {
    id: string | null;
    title: string | null;
    description: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    userId: string | null;
};
export type PlaylistMaxAggregateOutputType = {
    id: string | null;
    title: string | null;
    description: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    userId: string | null;
};
export type PlaylistCountAggregateOutputType = {
    id: number;
    title: number;
    description: number;
    createdAt: number;
    updatedAt: number;
    userId: number;
    _all: number;
};
export type PlaylistMinAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
};
export type PlaylistMaxAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
};
export type PlaylistCountAggregateInputType = {
    id?: true;
    title?: true;
    description?: true;
    createdAt?: true;
    updatedAt?: true;
    userId?: true;
    _all?: true;
};
export type PlaylistAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistWhereInput;
    orderBy?: Prisma.PlaylistOrderByWithRelationInput | Prisma.PlaylistOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | PlaylistCountAggregateInputType;
    _min?: PlaylistMinAggregateInputType;
    _max?: PlaylistMaxAggregateInputType;
};
export type GetPlaylistAggregateType<T extends PlaylistAggregateArgs> = {
    [P in keyof T & keyof AggregatePlaylist]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregatePlaylist[P]> : Prisma.GetScalarType<T[P], AggregatePlaylist[P]>;
};
export type PlaylistGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistWhereInput;
    orderBy?: Prisma.PlaylistOrderByWithAggregationInput | Prisma.PlaylistOrderByWithAggregationInput[];
    by: Prisma.PlaylistScalarFieldEnum[] | Prisma.PlaylistScalarFieldEnum;
    having?: Prisma.PlaylistScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: PlaylistCountAggregateInputType | true;
    _min?: PlaylistMinAggregateInputType;
    _max?: PlaylistMaxAggregateInputType;
};
export type PlaylistGroupByOutputType = {
    id: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    userId: string;
    _count: PlaylistCountAggregateOutputType | null;
    _min: PlaylistMinAggregateOutputType | null;
    _max: PlaylistMaxAggregateOutputType | null;
};
export type GetPlaylistGroupByPayload<T extends PlaylistGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<PlaylistGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof PlaylistGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], PlaylistGroupByOutputType[P]> : Prisma.GetScalarType<T[P], PlaylistGroupByOutputType[P]>;
}>>;
export type PlaylistWhereInput = {
    AND?: Prisma.PlaylistWhereInput | Prisma.PlaylistWhereInput[];
    OR?: Prisma.PlaylistWhereInput[];
    NOT?: Prisma.PlaylistWhereInput | Prisma.PlaylistWhereInput[];
    id?: Prisma.StringFilter<"Playlist"> | string;
    title?: Prisma.StringFilter<"Playlist"> | string;
    description?: Prisma.StringNullableFilter<"Playlist"> | string | null;
    createdAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    userId?: Prisma.StringFilter<"Playlist"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    items?: Prisma.PlaylistItemListRelationFilter;
};
export type PlaylistOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    items?: Prisma.PlaylistItemOrderByRelationAggregateInput;
};
export type PlaylistWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.PlaylistWhereInput | Prisma.PlaylistWhereInput[];
    OR?: Prisma.PlaylistWhereInput[];
    NOT?: Prisma.PlaylistWhereInput | Prisma.PlaylistWhereInput[];
    title?: Prisma.StringFilter<"Playlist"> | string;
    description?: Prisma.StringNullableFilter<"Playlist"> | string | null;
    createdAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    userId?: Prisma.StringFilter<"Playlist"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    items?: Prisma.PlaylistItemListRelationFilter;
}, "id">;
export type PlaylistOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    _count?: Prisma.PlaylistCountOrderByAggregateInput;
    _max?: Prisma.PlaylistMaxOrderByAggregateInput;
    _min?: Prisma.PlaylistMinOrderByAggregateInput;
};
export type PlaylistScalarWhereWithAggregatesInput = {
    AND?: Prisma.PlaylistScalarWhereWithAggregatesInput | Prisma.PlaylistScalarWhereWithAggregatesInput[];
    OR?: Prisma.PlaylistScalarWhereWithAggregatesInput[];
    NOT?: Prisma.PlaylistScalarWhereWithAggregatesInput | Prisma.PlaylistScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Playlist"> | string;
    title?: Prisma.StringWithAggregatesFilter<"Playlist"> | string;
    description?: Prisma.StringNullableWithAggregatesFilter<"Playlist"> | string | null;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Playlist"> | Date | string;
    updatedAt?: Prisma.DateTimeWithAggregatesFilter<"Playlist"> | Date | string;
    userId?: Prisma.StringWithAggregatesFilter<"Playlist"> | string;
};
export type PlaylistCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutPlaylistsInput;
    items?: Prisma.PlaylistItemCreateNestedManyWithoutPlaylistInput;
};
export type PlaylistUncheckedCreateInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
    items?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutPlaylistInput;
};
export type PlaylistUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutPlaylistsNestedInput;
    items?: Prisma.PlaylistItemUpdateManyWithoutPlaylistNestedInput;
};
export type PlaylistUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.PlaylistItemUncheckedUpdateManyWithoutPlaylistNestedInput;
};
export type PlaylistCreateManyInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
};
export type PlaylistUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PlaylistUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistListRelationFilter = {
    every?: Prisma.PlaylistWhereInput;
    some?: Prisma.PlaylistWhereInput;
    none?: Prisma.PlaylistWhereInput;
};
export type PlaylistOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type PlaylistCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type PlaylistMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type PlaylistMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    description?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    updatedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
};
export type PlaylistScalarRelationFilter = {
    is?: Prisma.PlaylistWhereInput;
    isNot?: Prisma.PlaylistWhereInput;
};
export type PlaylistCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput> | Prisma.PlaylistCreateWithoutUserInput[] | Prisma.PlaylistUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutUserInput | Prisma.PlaylistCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.PlaylistCreateManyUserInputEnvelope;
    connect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
};
export type PlaylistUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput> | Prisma.PlaylistCreateWithoutUserInput[] | Prisma.PlaylistUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutUserInput | Prisma.PlaylistCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.PlaylistCreateManyUserInputEnvelope;
    connect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
};
export type PlaylistUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput> | Prisma.PlaylistCreateWithoutUserInput[] | Prisma.PlaylistUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutUserInput | Prisma.PlaylistCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.PlaylistUpsertWithWhereUniqueWithoutUserInput | Prisma.PlaylistUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.PlaylistCreateManyUserInputEnvelope;
    set?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    disconnect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    delete?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    connect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    update?: Prisma.PlaylistUpdateWithWhereUniqueWithoutUserInput | Prisma.PlaylistUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.PlaylistUpdateManyWithWhereWithoutUserInput | Prisma.PlaylistUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.PlaylistScalarWhereInput | Prisma.PlaylistScalarWhereInput[];
};
export type PlaylistUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput> | Prisma.PlaylistCreateWithoutUserInput[] | Prisma.PlaylistUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutUserInput | Prisma.PlaylistCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.PlaylistUpsertWithWhereUniqueWithoutUserInput | Prisma.PlaylistUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.PlaylistCreateManyUserInputEnvelope;
    set?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    disconnect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    delete?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    connect?: Prisma.PlaylistWhereUniqueInput | Prisma.PlaylistWhereUniqueInput[];
    update?: Prisma.PlaylistUpdateWithWhereUniqueWithoutUserInput | Prisma.PlaylistUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.PlaylistUpdateManyWithWhereWithoutUserInput | Prisma.PlaylistUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.PlaylistScalarWhereInput | Prisma.PlaylistScalarWhereInput[];
};
export type PlaylistCreateNestedOneWithoutItemsInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutItemsInput, Prisma.PlaylistUncheckedCreateWithoutItemsInput>;
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutItemsInput;
    connect?: Prisma.PlaylistWhereUniqueInput;
};
export type PlaylistUpdateOneRequiredWithoutItemsNestedInput = {
    create?: Prisma.XOR<Prisma.PlaylistCreateWithoutItemsInput, Prisma.PlaylistUncheckedCreateWithoutItemsInput>;
    connectOrCreate?: Prisma.PlaylistCreateOrConnectWithoutItemsInput;
    upsert?: Prisma.PlaylistUpsertWithoutItemsInput;
    connect?: Prisma.PlaylistWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.PlaylistUpdateToOneWithWhereWithoutItemsInput, Prisma.PlaylistUpdateWithoutItemsInput>, Prisma.PlaylistUncheckedUpdateWithoutItemsInput>;
};
export type PlaylistCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    items?: Prisma.PlaylistItemCreateNestedManyWithoutPlaylistInput;
};
export type PlaylistUncheckedCreateWithoutUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    items?: Prisma.PlaylistItemUncheckedCreateNestedManyWithoutPlaylistInput;
};
export type PlaylistCreateOrConnectWithoutUserInput = {
    where: Prisma.PlaylistWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput>;
};
export type PlaylistCreateManyUserInputEnvelope = {
    data: Prisma.PlaylistCreateManyUserInput | Prisma.PlaylistCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type PlaylistUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.PlaylistWhereUniqueInput;
    update: Prisma.XOR<Prisma.PlaylistUpdateWithoutUserInput, Prisma.PlaylistUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.PlaylistCreateWithoutUserInput, Prisma.PlaylistUncheckedCreateWithoutUserInput>;
};
export type PlaylistUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.PlaylistWhereUniqueInput;
    data: Prisma.XOR<Prisma.PlaylistUpdateWithoutUserInput, Prisma.PlaylistUncheckedUpdateWithoutUserInput>;
};
export type PlaylistUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.PlaylistScalarWhereInput;
    data: Prisma.XOR<Prisma.PlaylistUpdateManyMutationInput, Prisma.PlaylistUncheckedUpdateManyWithoutUserInput>;
};
export type PlaylistScalarWhereInput = {
    AND?: Prisma.PlaylistScalarWhereInput | Prisma.PlaylistScalarWhereInput[];
    OR?: Prisma.PlaylistScalarWhereInput[];
    NOT?: Prisma.PlaylistScalarWhereInput | Prisma.PlaylistScalarWhereInput[];
    id?: Prisma.StringFilter<"Playlist"> | string;
    title?: Prisma.StringFilter<"Playlist"> | string;
    description?: Prisma.StringNullableFilter<"Playlist"> | string | null;
    createdAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    updatedAt?: Prisma.DateTimeFilter<"Playlist"> | Date | string;
    userId?: Prisma.StringFilter<"Playlist"> | string;
};
export type PlaylistCreateWithoutItemsInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutPlaylistsInput;
};
export type PlaylistUncheckedCreateWithoutItemsInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    userId: string;
};
export type PlaylistCreateOrConnectWithoutItemsInput = {
    where: Prisma.PlaylistWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistCreateWithoutItemsInput, Prisma.PlaylistUncheckedCreateWithoutItemsInput>;
};
export type PlaylistUpsertWithoutItemsInput = {
    update: Prisma.XOR<Prisma.PlaylistUpdateWithoutItemsInput, Prisma.PlaylistUncheckedUpdateWithoutItemsInput>;
    create: Prisma.XOR<Prisma.PlaylistCreateWithoutItemsInput, Prisma.PlaylistUncheckedCreateWithoutItemsInput>;
    where?: Prisma.PlaylistWhereInput;
};
export type PlaylistUpdateToOneWithWhereWithoutItemsInput = {
    where?: Prisma.PlaylistWhereInput;
    data: Prisma.XOR<Prisma.PlaylistUpdateWithoutItemsInput, Prisma.PlaylistUncheckedUpdateWithoutItemsInput>;
};
export type PlaylistUpdateWithoutItemsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutPlaylistsNestedInput;
};
export type PlaylistUncheckedUpdateWithoutItemsInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlaylistCreateManyUserInput = {
    id?: string;
    title: string;
    description?: string | null;
    createdAt?: Date | string;
    updatedAt?: Date | string;
};
export type PlaylistUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    items?: Prisma.PlaylistItemUpdateManyWithoutPlaylistNestedInput;
};
export type PlaylistUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    items?: Prisma.PlaylistItemUncheckedUpdateManyWithoutPlaylistNestedInput;
};
export type PlaylistUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    description?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    updatedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PlaylistCountOutputType = {
    items: number;
};
export type PlaylistCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    items?: boolean | PlaylistCountOutputTypeCountItemsArgs;
};
export type PlaylistCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistCountOutputTypeSelect<ExtArgs> | null;
};
export type PlaylistCountOutputTypeCountItemsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistItemWhereInput;
};
export type PlaylistSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    items?: boolean | Prisma.Playlist$itemsArgs<ExtArgs>;
    _count?: boolean | Prisma.PlaylistCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlist"]>;
export type PlaylistSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlist"]>;
export type PlaylistSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    title?: boolean;
    description?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playlist"]>;
export type PlaylistSelectScalar = {
    id?: boolean;
    title?: boolean;
    description?: boolean;
    createdAt?: boolean;
    updatedAt?: boolean;
    userId?: boolean;
};
export type PlaylistOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "title" | "description" | "createdAt" | "updatedAt" | "userId", ExtArgs["result"]["playlist"]>;
export type PlaylistInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    items?: boolean | Prisma.Playlist$itemsArgs<ExtArgs>;
    _count?: boolean | Prisma.PlaylistCountOutputTypeDefaultArgs<ExtArgs>;
};
export type PlaylistIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type PlaylistIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $PlaylistPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Playlist";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        items: Prisma.$PlaylistItemPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        title: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }, ExtArgs["result"]["playlist"]>;
    composites: {};
};
export type PlaylistGetPayload<S extends boolean | null | undefined | PlaylistDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$PlaylistPayload, S>;
export type PlaylistCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<PlaylistFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: PlaylistCountAggregateInputType | true;
};
export interface PlaylistDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Playlist'];
        meta: {
            name: 'Playlist';
        };
    };
    findUnique<T extends PlaylistFindUniqueArgs>(args: Prisma.SelectSubset<T, PlaylistFindUniqueArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends PlaylistFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, PlaylistFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends PlaylistFindFirstArgs>(args?: Prisma.SelectSubset<T, PlaylistFindFirstArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends PlaylistFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, PlaylistFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends PlaylistFindManyArgs>(args?: Prisma.SelectSubset<T, PlaylistFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends PlaylistCreateArgs>(args: Prisma.SelectSubset<T, PlaylistCreateArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends PlaylistCreateManyArgs>(args?: Prisma.SelectSubset<T, PlaylistCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends PlaylistCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, PlaylistCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends PlaylistDeleteArgs>(args: Prisma.SelectSubset<T, PlaylistDeleteArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends PlaylistUpdateArgs>(args: Prisma.SelectSubset<T, PlaylistUpdateArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends PlaylistDeleteManyArgs>(args?: Prisma.SelectSubset<T, PlaylistDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends PlaylistUpdateManyArgs>(args: Prisma.SelectSubset<T, PlaylistUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends PlaylistUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, PlaylistUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends PlaylistUpsertArgs>(args: Prisma.SelectSubset<T, PlaylistUpsertArgs<ExtArgs>>): Prisma.Prisma__PlaylistClient<runtime.Types.Result.GetResult<Prisma.$PlaylistPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends PlaylistCountArgs>(args?: Prisma.Subset<T, PlaylistCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], PlaylistCountAggregateOutputType> : number>;
    aggregate<T extends PlaylistAggregateArgs>(args: Prisma.Subset<T, PlaylistAggregateArgs>): Prisma.PrismaPromise<GetPlaylistAggregateType<T>>;
    groupBy<T extends PlaylistGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: PlaylistGroupByArgs['orderBy'];
    } : {
        orderBy?: PlaylistGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, PlaylistGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlaylistGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: PlaylistFieldRefs;
}
export interface Prisma__PlaylistClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    items<T extends Prisma.Playlist$itemsArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Playlist$itemsArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlaylistItemPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface PlaylistFieldRefs {
    readonly id: Prisma.FieldRef<"Playlist", 'String'>;
    readonly title: Prisma.FieldRef<"Playlist", 'String'>;
    readonly description: Prisma.FieldRef<"Playlist", 'String'>;
    readonly createdAt: Prisma.FieldRef<"Playlist", 'DateTime'>;
    readonly updatedAt: Prisma.FieldRef<"Playlist", 'DateTime'>;
    readonly userId: Prisma.FieldRef<"Playlist", 'String'>;
}
export type PlaylistFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where: Prisma.PlaylistWhereUniqueInput;
};
export type PlaylistFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where: Prisma.PlaylistWhereUniqueInput;
};
export type PlaylistFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where?: Prisma.PlaylistWhereInput;
    orderBy?: Prisma.PlaylistOrderByWithRelationInput | Prisma.PlaylistOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PlaylistScalarFieldEnum | Prisma.PlaylistScalarFieldEnum[];
};
export type PlaylistFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where?: Prisma.PlaylistWhereInput;
    orderBy?: Prisma.PlaylistOrderByWithRelationInput | Prisma.PlaylistOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PlaylistScalarFieldEnum | Prisma.PlaylistScalarFieldEnum[];
};
export type PlaylistFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where?: Prisma.PlaylistWhereInput;
    orderBy?: Prisma.PlaylistOrderByWithRelationInput | Prisma.PlaylistOrderByWithRelationInput[];
    cursor?: Prisma.PlaylistWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.PlaylistScalarFieldEnum | Prisma.PlaylistScalarFieldEnum[];
};
export type PlaylistCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistCreateInput, Prisma.PlaylistUncheckedCreateInput>;
};
export type PlaylistCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.PlaylistCreateManyInput | Prisma.PlaylistCreateManyInput[];
    skipDuplicates?: boolean;
};
export type PlaylistCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    data: Prisma.PlaylistCreateManyInput | Prisma.PlaylistCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.PlaylistIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type PlaylistUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistUpdateInput, Prisma.PlaylistUncheckedUpdateInput>;
    where: Prisma.PlaylistWhereUniqueInput;
};
export type PlaylistUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.PlaylistUpdateManyMutationInput, Prisma.PlaylistUncheckedUpdateManyInput>;
    where?: Prisma.PlaylistWhereInput;
    limit?: number;
};
export type PlaylistUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlaylistUpdateManyMutationInput, Prisma.PlaylistUncheckedUpdateManyInput>;
    where?: Prisma.PlaylistWhereInput;
    limit?: number;
    include?: Prisma.PlaylistIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type PlaylistUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where: Prisma.PlaylistWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlaylistCreateInput, Prisma.PlaylistUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.PlaylistUpdateInput, Prisma.PlaylistUncheckedUpdateInput>;
};
export type PlaylistDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
    where: Prisma.PlaylistWhereUniqueInput;
};
export type PlaylistDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlaylistWhereInput;
    limit?: number;
};
export type Playlist$itemsArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlaylistDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlaylistSelect<ExtArgs> | null;
    omit?: Prisma.PlaylistOmit<ExtArgs> | null;
    include?: Prisma.PlaylistInclude<ExtArgs> | null;
};
