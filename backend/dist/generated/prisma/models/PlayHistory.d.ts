import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type PlayHistoryModel = runtime.Types.Result.DefaultSelection<Prisma.$PlayHistoryPayload>;
export type AggregatePlayHistory = {
    _count: PlayHistoryCountAggregateOutputType | null;
    _min: PlayHistoryMinAggregateOutputType | null;
    _max: PlayHistoryMaxAggregateOutputType | null;
};
export type PlayHistoryMinAggregateOutputType = {
    id: string | null;
    playedAt: Date | null;
    userId: string | null;
    mixId: string | null;
};
export type PlayHistoryMaxAggregateOutputType = {
    id: string | null;
    playedAt: Date | null;
    userId: string | null;
    mixId: string | null;
};
export type PlayHistoryCountAggregateOutputType = {
    id: number;
    playedAt: number;
    userId: number;
    mixId: number;
    _all: number;
};
export type PlayHistoryMinAggregateInputType = {
    id?: true;
    playedAt?: true;
    userId?: true;
    mixId?: true;
};
export type PlayHistoryMaxAggregateInputType = {
    id?: true;
    playedAt?: true;
    userId?: true;
    mixId?: true;
};
export type PlayHistoryCountAggregateInputType = {
    id?: true;
    playedAt?: true;
    userId?: true;
    mixId?: true;
    _all?: true;
};
export type PlayHistoryAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlayHistoryWhereInput;
    orderBy?: Prisma.PlayHistoryOrderByWithRelationInput | Prisma.PlayHistoryOrderByWithRelationInput[];
    cursor?: Prisma.PlayHistoryWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | PlayHistoryCountAggregateInputType;
    _min?: PlayHistoryMinAggregateInputType;
    _max?: PlayHistoryMaxAggregateInputType;
};
export type GetPlayHistoryAggregateType<T extends PlayHistoryAggregateArgs> = {
    [P in keyof T & keyof AggregatePlayHistory]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregatePlayHistory[P]> : Prisma.GetScalarType<T[P], AggregatePlayHistory[P]>;
};
export type PlayHistoryGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlayHistoryWhereInput;
    orderBy?: Prisma.PlayHistoryOrderByWithAggregationInput | Prisma.PlayHistoryOrderByWithAggregationInput[];
    by: Prisma.PlayHistoryScalarFieldEnum[] | Prisma.PlayHistoryScalarFieldEnum;
    having?: Prisma.PlayHistoryScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: PlayHistoryCountAggregateInputType | true;
    _min?: PlayHistoryMinAggregateInputType;
    _max?: PlayHistoryMaxAggregateInputType;
};
export type PlayHistoryGroupByOutputType = {
    id: string;
    playedAt: Date;
    userId: string;
    mixId: string;
    _count: PlayHistoryCountAggregateOutputType | null;
    _min: PlayHistoryMinAggregateOutputType | null;
    _max: PlayHistoryMaxAggregateOutputType | null;
};
export type GetPlayHistoryGroupByPayload<T extends PlayHistoryGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<PlayHistoryGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof PlayHistoryGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], PlayHistoryGroupByOutputType[P]> : Prisma.GetScalarType<T[P], PlayHistoryGroupByOutputType[P]>;
}>>;
export type PlayHistoryWhereInput = {
    AND?: Prisma.PlayHistoryWhereInput | Prisma.PlayHistoryWhereInput[];
    OR?: Prisma.PlayHistoryWhereInput[];
    NOT?: Prisma.PlayHistoryWhereInput | Prisma.PlayHistoryWhereInput[];
    id?: Prisma.StringFilter<"PlayHistory"> | string;
    playedAt?: Prisma.DateTimeFilter<"PlayHistory"> | Date | string;
    userId?: Prisma.StringFilter<"PlayHistory"> | string;
    mixId?: Prisma.StringFilter<"PlayHistory"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
};
export type PlayHistoryOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    playedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
    mix?: Prisma.MixOrderByWithRelationInput;
};
export type PlayHistoryWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId_mixId?: Prisma.PlayHistoryUserIdMixIdCompoundUniqueInput;
    AND?: Prisma.PlayHistoryWhereInput | Prisma.PlayHistoryWhereInput[];
    OR?: Prisma.PlayHistoryWhereInput[];
    NOT?: Prisma.PlayHistoryWhereInput | Prisma.PlayHistoryWhereInput[];
    playedAt?: Prisma.DateTimeFilter<"PlayHistory"> | Date | string;
    userId?: Prisma.StringFilter<"PlayHistory"> | string;
    mixId?: Prisma.StringFilter<"PlayHistory"> | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
}, "id" | "userId_mixId">;
export type PlayHistoryOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    playedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    _count?: Prisma.PlayHistoryCountOrderByAggregateInput;
    _max?: Prisma.PlayHistoryMaxOrderByAggregateInput;
    _min?: Prisma.PlayHistoryMinOrderByAggregateInput;
};
export type PlayHistoryScalarWhereWithAggregatesInput = {
    AND?: Prisma.PlayHistoryScalarWhereWithAggregatesInput | Prisma.PlayHistoryScalarWhereWithAggregatesInput[];
    OR?: Prisma.PlayHistoryScalarWhereWithAggregatesInput[];
    NOT?: Prisma.PlayHistoryScalarWhereWithAggregatesInput | Prisma.PlayHistoryScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"PlayHistory"> | string;
    playedAt?: Prisma.DateTimeWithAggregatesFilter<"PlayHistory"> | Date | string;
    userId?: Prisma.StringWithAggregatesFilter<"PlayHistory"> | string;
    mixId?: Prisma.StringWithAggregatesFilter<"PlayHistory"> | string;
};
export type PlayHistoryCreateInput = {
    id?: string;
    playedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutPlayHistoryInput;
    mix: Prisma.MixCreateNestedOneWithoutPlayHistoryInput;
};
export type PlayHistoryUncheckedCreateInput = {
    id?: string;
    playedAt?: Date | string;
    userId: string;
    mixId: string;
};
export type PlayHistoryUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutPlayHistoryNestedInput;
    mix?: Prisma.MixUpdateOneRequiredWithoutPlayHistoryNestedInput;
};
export type PlayHistoryUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistoryCreateManyInput = {
    id?: string;
    playedAt?: Date | string;
    userId: string;
    mixId: string;
};
export type PlayHistoryUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type PlayHistoryUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistoryListRelationFilter = {
    every?: Prisma.PlayHistoryWhereInput;
    some?: Prisma.PlayHistoryWhereInput;
    none?: Prisma.PlayHistoryWhereInput;
};
export type PlayHistoryOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type PlayHistoryUserIdMixIdCompoundUniqueInput = {
    userId: string;
    mixId: string;
};
export type PlayHistoryCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    playedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlayHistoryMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    playedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlayHistoryMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    playedAt?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type PlayHistoryCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput> | Prisma.PlayHistoryCreateWithoutUserInput[] | Prisma.PlayHistoryUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutUserInput | Prisma.PlayHistoryCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.PlayHistoryCreateManyUserInputEnvelope;
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
};
export type PlayHistoryUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput> | Prisma.PlayHistoryCreateWithoutUserInput[] | Prisma.PlayHistoryUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutUserInput | Prisma.PlayHistoryCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.PlayHistoryCreateManyUserInputEnvelope;
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
};
export type PlayHistoryUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput> | Prisma.PlayHistoryCreateWithoutUserInput[] | Prisma.PlayHistoryUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutUserInput | Prisma.PlayHistoryCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.PlayHistoryUpsertWithWhereUniqueWithoutUserInput | Prisma.PlayHistoryUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.PlayHistoryCreateManyUserInputEnvelope;
    set?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    disconnect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    delete?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    update?: Prisma.PlayHistoryUpdateWithWhereUniqueWithoutUserInput | Prisma.PlayHistoryUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.PlayHistoryUpdateManyWithWhereWithoutUserInput | Prisma.PlayHistoryUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
};
export type PlayHistoryUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput> | Prisma.PlayHistoryCreateWithoutUserInput[] | Prisma.PlayHistoryUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutUserInput | Prisma.PlayHistoryCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.PlayHistoryUpsertWithWhereUniqueWithoutUserInput | Prisma.PlayHistoryUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.PlayHistoryCreateManyUserInputEnvelope;
    set?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    disconnect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    delete?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    update?: Prisma.PlayHistoryUpdateWithWhereUniqueWithoutUserInput | Prisma.PlayHistoryUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.PlayHistoryUpdateManyWithWhereWithoutUserInput | Prisma.PlayHistoryUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
};
export type PlayHistoryCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput> | Prisma.PlayHistoryCreateWithoutMixInput[] | Prisma.PlayHistoryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutMixInput | Prisma.PlayHistoryCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.PlayHistoryCreateManyMixInputEnvelope;
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
};
export type PlayHistoryUncheckedCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput> | Prisma.PlayHistoryCreateWithoutMixInput[] | Prisma.PlayHistoryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutMixInput | Prisma.PlayHistoryCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.PlayHistoryCreateManyMixInputEnvelope;
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
};
export type PlayHistoryUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput> | Prisma.PlayHistoryCreateWithoutMixInput[] | Prisma.PlayHistoryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutMixInput | Prisma.PlayHistoryCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.PlayHistoryUpsertWithWhereUniqueWithoutMixInput | Prisma.PlayHistoryUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.PlayHistoryCreateManyMixInputEnvelope;
    set?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    disconnect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    delete?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    update?: Prisma.PlayHistoryUpdateWithWhereUniqueWithoutMixInput | Prisma.PlayHistoryUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.PlayHistoryUpdateManyWithWhereWithoutMixInput | Prisma.PlayHistoryUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
};
export type PlayHistoryUncheckedUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput> | Prisma.PlayHistoryCreateWithoutMixInput[] | Prisma.PlayHistoryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.PlayHistoryCreateOrConnectWithoutMixInput | Prisma.PlayHistoryCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.PlayHistoryUpsertWithWhereUniqueWithoutMixInput | Prisma.PlayHistoryUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.PlayHistoryCreateManyMixInputEnvelope;
    set?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    disconnect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    delete?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    connect?: Prisma.PlayHistoryWhereUniqueInput | Prisma.PlayHistoryWhereUniqueInput[];
    update?: Prisma.PlayHistoryUpdateWithWhereUniqueWithoutMixInput | Prisma.PlayHistoryUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.PlayHistoryUpdateManyWithWhereWithoutMixInput | Prisma.PlayHistoryUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
};
export type PlayHistoryCreateWithoutUserInput = {
    id?: string;
    playedAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutPlayHistoryInput;
};
export type PlayHistoryUncheckedCreateWithoutUserInput = {
    id?: string;
    playedAt?: Date | string;
    mixId: string;
};
export type PlayHistoryCreateOrConnectWithoutUserInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput>;
};
export type PlayHistoryCreateManyUserInputEnvelope = {
    data: Prisma.PlayHistoryCreateManyUserInput | Prisma.PlayHistoryCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type PlayHistoryUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    update: Prisma.XOR<Prisma.PlayHistoryUpdateWithoutUserInput, Prisma.PlayHistoryUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.PlayHistoryCreateWithoutUserInput, Prisma.PlayHistoryUncheckedCreateWithoutUserInput>;
};
export type PlayHistoryUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateWithoutUserInput, Prisma.PlayHistoryUncheckedUpdateWithoutUserInput>;
};
export type PlayHistoryUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.PlayHistoryScalarWhereInput;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateManyMutationInput, Prisma.PlayHistoryUncheckedUpdateManyWithoutUserInput>;
};
export type PlayHistoryScalarWhereInput = {
    AND?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
    OR?: Prisma.PlayHistoryScalarWhereInput[];
    NOT?: Prisma.PlayHistoryScalarWhereInput | Prisma.PlayHistoryScalarWhereInput[];
    id?: Prisma.StringFilter<"PlayHistory"> | string;
    playedAt?: Prisma.DateTimeFilter<"PlayHistory"> | Date | string;
    userId?: Prisma.StringFilter<"PlayHistory"> | string;
    mixId?: Prisma.StringFilter<"PlayHistory"> | string;
};
export type PlayHistoryCreateWithoutMixInput = {
    id?: string;
    playedAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutPlayHistoryInput;
};
export type PlayHistoryUncheckedCreateWithoutMixInput = {
    id?: string;
    playedAt?: Date | string;
    userId: string;
};
export type PlayHistoryCreateOrConnectWithoutMixInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput>;
};
export type PlayHistoryCreateManyMixInputEnvelope = {
    data: Prisma.PlayHistoryCreateManyMixInput | Prisma.PlayHistoryCreateManyMixInput[];
    skipDuplicates?: boolean;
};
export type PlayHistoryUpsertWithWhereUniqueWithoutMixInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    update: Prisma.XOR<Prisma.PlayHistoryUpdateWithoutMixInput, Prisma.PlayHistoryUncheckedUpdateWithoutMixInput>;
    create: Prisma.XOR<Prisma.PlayHistoryCreateWithoutMixInput, Prisma.PlayHistoryUncheckedCreateWithoutMixInput>;
};
export type PlayHistoryUpdateWithWhereUniqueWithoutMixInput = {
    where: Prisma.PlayHistoryWhereUniqueInput;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateWithoutMixInput, Prisma.PlayHistoryUncheckedUpdateWithoutMixInput>;
};
export type PlayHistoryUpdateManyWithWhereWithoutMixInput = {
    where: Prisma.PlayHistoryScalarWhereInput;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateManyMutationInput, Prisma.PlayHistoryUncheckedUpdateManyWithoutMixInput>;
};
export type PlayHistoryCreateManyUserInput = {
    id?: string;
    playedAt?: Date | string;
    mixId: string;
};
export type PlayHistoryUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutPlayHistoryNestedInput;
};
export type PlayHistoryUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistoryUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistoryCreateManyMixInput = {
    id?: string;
    playedAt?: Date | string;
    userId: string;
};
export type PlayHistoryUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutPlayHistoryNestedInput;
};
export type PlayHistoryUncheckedUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistoryUncheckedUpdateManyWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    playedAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type PlayHistorySelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    playedAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playHistory"]>;
export type PlayHistorySelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    playedAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playHistory"]>;
export type PlayHistorySelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    playedAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["playHistory"]>;
export type PlayHistorySelectScalar = {
    id?: boolean;
    playedAt?: boolean;
    userId?: boolean;
    mixId?: boolean;
};
export type PlayHistoryOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "playedAt" | "userId" | "mixId", ExtArgs["result"]["playHistory"]>;
export type PlayHistoryInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type PlayHistoryIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type PlayHistoryIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type $PlayHistoryPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "PlayHistory";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
        mix: Prisma.$MixPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        playedAt: Date;
        userId: string;
        mixId: string;
    }, ExtArgs["result"]["playHistory"]>;
    composites: {};
};
export type PlayHistoryGetPayload<S extends boolean | null | undefined | PlayHistoryDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload, S>;
export type PlayHistoryCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<PlayHistoryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: PlayHistoryCountAggregateInputType | true;
};
export interface PlayHistoryDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['PlayHistory'];
        meta: {
            name: 'PlayHistory';
        };
    };
    findUnique<T extends PlayHistoryFindUniqueArgs>(args: Prisma.SelectSubset<T, PlayHistoryFindUniqueArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends PlayHistoryFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, PlayHistoryFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends PlayHistoryFindFirstArgs>(args?: Prisma.SelectSubset<T, PlayHistoryFindFirstArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends PlayHistoryFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, PlayHistoryFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends PlayHistoryFindManyArgs>(args?: Prisma.SelectSubset<T, PlayHistoryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends PlayHistoryCreateArgs>(args: Prisma.SelectSubset<T, PlayHistoryCreateArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends PlayHistoryCreateManyArgs>(args?: Prisma.SelectSubset<T, PlayHistoryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends PlayHistoryCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, PlayHistoryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends PlayHistoryDeleteArgs>(args: Prisma.SelectSubset<T, PlayHistoryDeleteArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends PlayHistoryUpdateArgs>(args: Prisma.SelectSubset<T, PlayHistoryUpdateArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends PlayHistoryDeleteManyArgs>(args?: Prisma.SelectSubset<T, PlayHistoryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends PlayHistoryUpdateManyArgs>(args: Prisma.SelectSubset<T, PlayHistoryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends PlayHistoryUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, PlayHistoryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends PlayHistoryUpsertArgs>(args: Prisma.SelectSubset<T, PlayHistoryUpsertArgs<ExtArgs>>): Prisma.Prisma__PlayHistoryClient<runtime.Types.Result.GetResult<Prisma.$PlayHistoryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends PlayHistoryCountArgs>(args?: Prisma.Subset<T, PlayHistoryCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], PlayHistoryCountAggregateOutputType> : number>;
    aggregate<T extends PlayHistoryAggregateArgs>(args: Prisma.Subset<T, PlayHistoryAggregateArgs>): Prisma.PrismaPromise<GetPlayHistoryAggregateType<T>>;
    groupBy<T extends PlayHistoryGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: PlayHistoryGroupByArgs['orderBy'];
    } : {
        orderBy?: PlayHistoryGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, PlayHistoryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetPlayHistoryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: PlayHistoryFieldRefs;
}
export interface Prisma__PlayHistoryClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    mix<T extends Prisma.MixDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.MixDefaultArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface PlayHistoryFieldRefs {
    readonly id: Prisma.FieldRef<"PlayHistory", 'String'>;
    readonly playedAt: Prisma.FieldRef<"PlayHistory", 'DateTime'>;
    readonly userId: Prisma.FieldRef<"PlayHistory", 'String'>;
    readonly mixId: Prisma.FieldRef<"PlayHistory", 'String'>;
}
export type PlayHistoryFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    where: Prisma.PlayHistoryWhereUniqueInput;
};
export type PlayHistoryFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    where: Prisma.PlayHistoryWhereUniqueInput;
};
export type PlayHistoryFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlayHistoryFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlayHistoryFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type PlayHistoryCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlayHistoryCreateInput, Prisma.PlayHistoryUncheckedCreateInput>;
};
export type PlayHistoryCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.PlayHistoryCreateManyInput | Prisma.PlayHistoryCreateManyInput[];
    skipDuplicates?: boolean;
};
export type PlayHistoryCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    data: Prisma.PlayHistoryCreateManyInput | Prisma.PlayHistoryCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.PlayHistoryIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type PlayHistoryUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateInput, Prisma.PlayHistoryUncheckedUpdateInput>;
    where: Prisma.PlayHistoryWhereUniqueInput;
};
export type PlayHistoryUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.PlayHistoryUpdateManyMutationInput, Prisma.PlayHistoryUncheckedUpdateManyInput>;
    where?: Prisma.PlayHistoryWhereInput;
    limit?: number;
};
export type PlayHistoryUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.PlayHistoryUpdateManyMutationInput, Prisma.PlayHistoryUncheckedUpdateManyInput>;
    where?: Prisma.PlayHistoryWhereInput;
    limit?: number;
    include?: Prisma.PlayHistoryIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type PlayHistoryUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    where: Prisma.PlayHistoryWhereUniqueInput;
    create: Prisma.XOR<Prisma.PlayHistoryCreateInput, Prisma.PlayHistoryUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.PlayHistoryUpdateInput, Prisma.PlayHistoryUncheckedUpdateInput>;
};
export type PlayHistoryDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
    where: Prisma.PlayHistoryWhereUniqueInput;
};
export type PlayHistoryDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.PlayHistoryWhereInput;
    limit?: number;
};
export type PlayHistoryDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.PlayHistorySelect<ExtArgs> | null;
    omit?: Prisma.PlayHistoryOmit<ExtArgs> | null;
    include?: Prisma.PlayHistoryInclude<ExtArgs> | null;
};
