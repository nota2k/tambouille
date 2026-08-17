import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type FavoriteModel = runtime.Types.Result.DefaultSelection<Prisma.$FavoritePayload>;
export type AggregateFavorite = {
    _count: FavoriteCountAggregateOutputType | null;
    _min: FavoriteMinAggregateOutputType | null;
    _max: FavoriteMaxAggregateOutputType | null;
};
export type FavoriteMinAggregateOutputType = {
    id: string | null;
    createdAt: Date | null;
    userId: string | null;
    mixId: string | null;
};
export type FavoriteMaxAggregateOutputType = {
    id: string | null;
    createdAt: Date | null;
    userId: string | null;
    mixId: string | null;
};
export type FavoriteCountAggregateOutputType = {
    id: number;
    createdAt: number;
    userId: number;
    mixId: number;
    _all: number;
};
export type FavoriteMinAggregateInputType = {
    id?: true;
    createdAt?: true;
    userId?: true;
    mixId?: true;
};
export type FavoriteMaxAggregateInputType = {
    id?: true;
    createdAt?: true;
    userId?: true;
    mixId?: true;
};
export type FavoriteCountAggregateInputType = {
    id?: true;
    createdAt?: true;
    userId?: true;
    mixId?: true;
    _all?: true;
};
export type FavoriteAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.FavoriteWhereInput;
    orderBy?: Prisma.FavoriteOrderByWithRelationInput | Prisma.FavoriteOrderByWithRelationInput[];
    cursor?: Prisma.FavoriteWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | FavoriteCountAggregateInputType;
    _min?: FavoriteMinAggregateInputType;
    _max?: FavoriteMaxAggregateInputType;
};
export type GetFavoriteAggregateType<T extends FavoriteAggregateArgs> = {
    [P in keyof T & keyof AggregateFavorite]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateFavorite[P]> : Prisma.GetScalarType<T[P], AggregateFavorite[P]>;
};
export type FavoriteGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.FavoriteWhereInput;
    orderBy?: Prisma.FavoriteOrderByWithAggregationInput | Prisma.FavoriteOrderByWithAggregationInput[];
    by: Prisma.FavoriteScalarFieldEnum[] | Prisma.FavoriteScalarFieldEnum;
    having?: Prisma.FavoriteScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: FavoriteCountAggregateInputType | true;
    _min?: FavoriteMinAggregateInputType;
    _max?: FavoriteMaxAggregateInputType;
};
export type FavoriteGroupByOutputType = {
    id: string;
    createdAt: Date;
    userId: string;
    mixId: string;
    _count: FavoriteCountAggregateOutputType | null;
    _min: FavoriteMinAggregateOutputType | null;
    _max: FavoriteMaxAggregateOutputType | null;
};
export type GetFavoriteGroupByPayload<T extends FavoriteGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<FavoriteGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof FavoriteGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], FavoriteGroupByOutputType[P]> : Prisma.GetScalarType<T[P], FavoriteGroupByOutputType[P]>;
}>>;
export type FavoriteWhereInput = {
    AND?: Prisma.FavoriteWhereInput | Prisma.FavoriteWhereInput[];
    OR?: Prisma.FavoriteWhereInput[];
    NOT?: Prisma.FavoriteWhereInput | Prisma.FavoriteWhereInput[];
    id?: Prisma.StringFilter<"Favorite"> | string;
    createdAt?: Prisma.DateTimeFilter<"Favorite"> | Date | string;
    userId?: Prisma.StringFilter<"Favorite"> | string;
    mixId?: Prisma.StringFilter<"Favorite"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
};
export type FavoriteOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    mix?: Prisma.MixOrderByWithRelationInput;
};
export type FavoriteWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId_mixId?: Prisma.FavoriteUserIdMixIdCompoundUniqueInput;
    AND?: Prisma.FavoriteWhereInput | Prisma.FavoriteWhereInput[];
    OR?: Prisma.FavoriteWhereInput[];
    NOT?: Prisma.FavoriteWhereInput | Prisma.FavoriteWhereInput[];
    createdAt?: Prisma.DateTimeFilter<"Favorite"> | Date | string;
    userId?: Prisma.StringFilter<"Favorite"> | string;
    mixId?: Prisma.StringFilter<"Favorite"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
}, "id" | "userId_mixId">;
export type FavoriteOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    _count?: Prisma.FavoriteCountOrderByAggregateInput;
    _max?: Prisma.FavoriteMaxOrderByAggregateInput;
    _min?: Prisma.FavoriteMinOrderByAggregateInput;
};
export type FavoriteScalarWhereWithAggregatesInput = {
    AND?: Prisma.FavoriteScalarWhereWithAggregatesInput | Prisma.FavoriteScalarWhereWithAggregatesInput[];
    OR?: Prisma.FavoriteScalarWhereWithAggregatesInput[];
    NOT?: Prisma.FavoriteScalarWhereWithAggregatesInput | Prisma.FavoriteScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Favorite"> | string;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Favorite"> | Date | string;
    userId?: Prisma.StringWithAggregatesFilter<"Favorite"> | string;
    mixId?: Prisma.StringWithAggregatesFilter<"Favorite"> | string;
};
export type FavoriteCreateInput = {
    id?: string;
    createdAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutFavoritesInput;
    mix: Prisma.MixCreateNestedOneWithoutFavoritesInput;
};
export type FavoriteUncheckedCreateInput = {
    id?: string;
    createdAt?: Date | string;
    userId: string;
    mixId: string;
};
export type FavoriteUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutFavoritesNestedInput;
    mix?: Prisma.MixUpdateOneRequiredWithoutFavoritesNestedInput;
};
export type FavoriteUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteCreateManyInput = {
    id?: string;
    createdAt?: Date | string;
    userId: string;
    mixId: string;
};
export type FavoriteUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type FavoriteUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteListRelationFilter = {
    every?: Prisma.FavoriteWhereInput;
    some?: Prisma.FavoriteWhereInput;
    none?: Prisma.FavoriteWhereInput;
};
export type FavoriteOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type FavoriteUserIdMixIdCompoundUniqueInput = {
    userId: string;
    mixId: string;
};
export type FavoriteCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type FavoriteMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type FavoriteMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type FavoriteCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput> | Prisma.FavoriteCreateWithoutUserInput[] | Prisma.FavoriteUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutUserInput | Prisma.FavoriteCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.FavoriteCreateManyUserInputEnvelope;
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
};
export type FavoriteUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput> | Prisma.FavoriteCreateWithoutUserInput[] | Prisma.FavoriteUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutUserInput | Prisma.FavoriteCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.FavoriteCreateManyUserInputEnvelope;
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
};
export type FavoriteUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput> | Prisma.FavoriteCreateWithoutUserInput[] | Prisma.FavoriteUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutUserInput | Prisma.FavoriteCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.FavoriteUpsertWithWhereUniqueWithoutUserInput | Prisma.FavoriteUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.FavoriteCreateManyUserInputEnvelope;
    set?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    disconnect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    delete?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    update?: Prisma.FavoriteUpdateWithWhereUniqueWithoutUserInput | Prisma.FavoriteUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.FavoriteUpdateManyWithWhereWithoutUserInput | Prisma.FavoriteUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
};
export type FavoriteUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput> | Prisma.FavoriteCreateWithoutUserInput[] | Prisma.FavoriteUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutUserInput | Prisma.FavoriteCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.FavoriteUpsertWithWhereUniqueWithoutUserInput | Prisma.FavoriteUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.FavoriteCreateManyUserInputEnvelope;
    set?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    disconnect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    delete?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    update?: Prisma.FavoriteUpdateWithWhereUniqueWithoutUserInput | Prisma.FavoriteUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.FavoriteUpdateManyWithWhereWithoutUserInput | Prisma.FavoriteUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
};
export type FavoriteCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput> | Prisma.FavoriteCreateWithoutMixInput[] | Prisma.FavoriteUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutMixInput | Prisma.FavoriteCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.FavoriteCreateManyMixInputEnvelope;
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
};
export type FavoriteUncheckedCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput> | Prisma.FavoriteCreateWithoutMixInput[] | Prisma.FavoriteUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutMixInput | Prisma.FavoriteCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.FavoriteCreateManyMixInputEnvelope;
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
};
export type FavoriteUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput> | Prisma.FavoriteCreateWithoutMixInput[] | Prisma.FavoriteUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutMixInput | Prisma.FavoriteCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.FavoriteUpsertWithWhereUniqueWithoutMixInput | Prisma.FavoriteUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.FavoriteCreateManyMixInputEnvelope;
    set?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    disconnect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    delete?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    update?: Prisma.FavoriteUpdateWithWhereUniqueWithoutMixInput | Prisma.FavoriteUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.FavoriteUpdateManyWithWhereWithoutMixInput | Prisma.FavoriteUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
};
export type FavoriteUncheckedUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput> | Prisma.FavoriteCreateWithoutMixInput[] | Prisma.FavoriteUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.FavoriteCreateOrConnectWithoutMixInput | Prisma.FavoriteCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.FavoriteUpsertWithWhereUniqueWithoutMixInput | Prisma.FavoriteUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.FavoriteCreateManyMixInputEnvelope;
    set?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    disconnect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    delete?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    connect?: Prisma.FavoriteWhereUniqueInput | Prisma.FavoriteWhereUniqueInput[];
    update?: Prisma.FavoriteUpdateWithWhereUniqueWithoutMixInput | Prisma.FavoriteUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.FavoriteUpdateManyWithWhereWithoutMixInput | Prisma.FavoriteUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
};
export type FavoriteCreateWithoutUserInput = {
    id?: string;
    createdAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutFavoritesInput;
};
export type FavoriteUncheckedCreateWithoutUserInput = {
    id?: string;
    createdAt?: Date | string;
    mixId: string;
};
export type FavoriteCreateOrConnectWithoutUserInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    create: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput>;
};
export type FavoriteCreateManyUserInputEnvelope = {
    data: Prisma.FavoriteCreateManyUserInput | Prisma.FavoriteCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type FavoriteUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    update: Prisma.XOR<Prisma.FavoriteUpdateWithoutUserInput, Prisma.FavoriteUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.FavoriteCreateWithoutUserInput, Prisma.FavoriteUncheckedCreateWithoutUserInput>;
};
export type FavoriteUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    data: Prisma.XOR<Prisma.FavoriteUpdateWithoutUserInput, Prisma.FavoriteUncheckedUpdateWithoutUserInput>;
};
export type FavoriteUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.FavoriteScalarWhereInput;
    data: Prisma.XOR<Prisma.FavoriteUpdateManyMutationInput, Prisma.FavoriteUncheckedUpdateManyWithoutUserInput>;
};
export type FavoriteScalarWhereInput = {
    AND?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
    OR?: Prisma.FavoriteScalarWhereInput[];
    NOT?: Prisma.FavoriteScalarWhereInput | Prisma.FavoriteScalarWhereInput[];
    id?: Prisma.StringFilter<"Favorite"> | string;
    createdAt?: Prisma.DateTimeFilter<"Favorite"> | Date | string;
    userId?: Prisma.StringFilter<"Favorite"> | string;
    mixId?: Prisma.StringFilter<"Favorite"> | string;
};
export type FavoriteCreateWithoutMixInput = {
    id?: string;
    createdAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutFavoritesInput;
};
export type FavoriteUncheckedCreateWithoutMixInput = {
    id?: string;
    createdAt?: Date | string;
    userId: string;
};
export type FavoriteCreateOrConnectWithoutMixInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    create: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput>;
};
export type FavoriteCreateManyMixInputEnvelope = {
    data: Prisma.FavoriteCreateManyMixInput | Prisma.FavoriteCreateManyMixInput[];
    skipDuplicates?: boolean;
};
export type FavoriteUpsertWithWhereUniqueWithoutMixInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    update: Prisma.XOR<Prisma.FavoriteUpdateWithoutMixInput, Prisma.FavoriteUncheckedUpdateWithoutMixInput>;
    create: Prisma.XOR<Prisma.FavoriteCreateWithoutMixInput, Prisma.FavoriteUncheckedCreateWithoutMixInput>;
};
export type FavoriteUpdateWithWhereUniqueWithoutMixInput = {
    where: Prisma.FavoriteWhereUniqueInput;
    data: Prisma.XOR<Prisma.FavoriteUpdateWithoutMixInput, Prisma.FavoriteUncheckedUpdateWithoutMixInput>;
};
export type FavoriteUpdateManyWithWhereWithoutMixInput = {
    where: Prisma.FavoriteScalarWhereInput;
    data: Prisma.XOR<Prisma.FavoriteUpdateManyMutationInput, Prisma.FavoriteUncheckedUpdateManyWithoutMixInput>;
};
export type FavoriteCreateManyUserInput = {
    id?: string;
    createdAt?: Date | string;
    mixId: string;
};
export type FavoriteUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutFavoritesNestedInput;
};
export type FavoriteUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteCreateManyMixInput = {
    id?: string;
    createdAt?: Date | string;
    userId: string;
};
export type FavoriteUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutFavoritesNestedInput;
};
export type FavoriteUncheckedUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteUncheckedUpdateManyWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type FavoriteSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    createdAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["favorite"]>;
export type FavoriteSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    createdAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["favorite"]>;
export type FavoriteSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    createdAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["favorite"]>;
export type FavoriteSelectScalar = {
    id?: boolean;
    createdAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
};
export type FavoriteOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "createdAt" | "userId" | "mixId", ExtArgs["result"]["favorite"]>;
export type FavoriteInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type FavoriteIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type FavoriteIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type $FavoritePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Favorite";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        mix: Prisma.$MixPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        createdAt: Date;
        userId: string;
        mixId: string;
    }, ExtArgs["result"]["favorite"]>;
    composites: {};
};
export type FavoriteGetPayload<S extends boolean | null | undefined | FavoriteDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$FavoritePayload, S>;
export type FavoriteCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<FavoriteFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: FavoriteCountAggregateInputType | true;
};
export interface FavoriteDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Favorite'];
        meta: {
            name: 'Favorite';
        };
    };
    findUnique<T extends FavoriteFindUniqueArgs>(args: Prisma.SelectSubset<T, FavoriteFindUniqueArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends FavoriteFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, FavoriteFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends FavoriteFindFirstArgs>(args?: Prisma.SelectSubset<T, FavoriteFindFirstArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends FavoriteFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, FavoriteFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends FavoriteFindManyArgs>(args?: Prisma.SelectSubset<T, FavoriteFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends FavoriteCreateArgs>(args: Prisma.SelectSubset<T, FavoriteCreateArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends FavoriteCreateManyArgs>(args?: Prisma.SelectSubset<T, FavoriteCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends FavoriteCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, FavoriteCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends FavoriteDeleteArgs>(args: Prisma.SelectSubset<T, FavoriteDeleteArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends FavoriteUpdateArgs>(args: Prisma.SelectSubset<T, FavoriteUpdateArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends FavoriteDeleteManyArgs>(args?: Prisma.SelectSubset<T, FavoriteDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends FavoriteUpdateManyArgs>(args: Prisma.SelectSubset<T, FavoriteUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends FavoriteUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, FavoriteUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends FavoriteUpsertArgs>(args: Prisma.SelectSubset<T, FavoriteUpsertArgs<ExtArgs>>): Prisma.Prisma__FavoriteClient<runtime.Types.Result.GetResult<Prisma.$FavoritePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends FavoriteCountArgs>(args?: Prisma.Subset<T, FavoriteCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], FavoriteCountAggregateOutputType> : number>;
    aggregate<T extends FavoriteAggregateArgs>(args: Prisma.Subset<T, FavoriteAggregateArgs>): Prisma.PrismaPromise<GetFavoriteAggregateType<T>>;
    groupBy<T extends FavoriteGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: FavoriteGroupByArgs['orderBy'];
    } : {
        orderBy?: FavoriteGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, FavoriteGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFavoriteGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: FavoriteFieldRefs;
}
export interface Prisma__FavoriteClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    mix<T extends Prisma.MixDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.MixDefaultArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface FavoriteFieldRefs {
    readonly id: Prisma.FieldRef<"Favorite", 'String'>;
    readonly createdAt: Prisma.FieldRef<"Favorite", 'DateTime'>;
    readonly userId: Prisma.FieldRef<"Favorite", 'String'>;
    readonly mixId: Prisma.FieldRef<"Favorite", 'String'>;
}
export type FavoriteFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    where: Prisma.FavoriteWhereUniqueInput;
};
export type FavoriteFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    where: Prisma.FavoriteWhereUniqueInput;
};
export type FavoriteFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type FavoriteFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type FavoriteFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type FavoriteCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.FavoriteCreateInput, Prisma.FavoriteUncheckedCreateInput>;
};
export type FavoriteCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.FavoriteCreateManyInput | Prisma.FavoriteCreateManyInput[];
    skipDuplicates?: boolean;
};
export type FavoriteCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    data: Prisma.FavoriteCreateManyInput | Prisma.FavoriteCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.FavoriteIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type FavoriteUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.FavoriteUpdateInput, Prisma.FavoriteUncheckedUpdateInput>;
    where: Prisma.FavoriteWhereUniqueInput;
};
export type FavoriteUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.FavoriteUpdateManyMutationInput, Prisma.FavoriteUncheckedUpdateManyInput>;
    where?: Prisma.FavoriteWhereInput;
    limit?: number;
};
export type FavoriteUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.FavoriteUpdateManyMutationInput, Prisma.FavoriteUncheckedUpdateManyInput>;
    where?: Prisma.FavoriteWhereInput;
    limit?: number;
    include?: Prisma.FavoriteIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type FavoriteUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    where: Prisma.FavoriteWhereUniqueInput;
    create: Prisma.XOR<Prisma.FavoriteCreateInput, Prisma.FavoriteUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.FavoriteUpdateInput, Prisma.FavoriteUncheckedUpdateInput>;
};
export type FavoriteDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
    where: Prisma.FavoriteWhereUniqueInput;
};
export type FavoriteDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.FavoriteWhereInput;
    limit?: number;
};
export type FavoriteDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.FavoriteSelect<ExtArgs> | null;
    omit?: Prisma.FavoriteOmit<ExtArgs> | null;
    include?: Prisma.FavoriteInclude<ExtArgs> | null;
};
