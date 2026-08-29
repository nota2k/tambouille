import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type WatchedSourceModel = runtime.Types.Result.DefaultSelection<Prisma.$WatchedSourcePayload>;
export type AggregateWatchedSource = {
    _count: WatchedSourceCountAggregateOutputType | null;
    _avg: WatchedSourceAvgAggregateOutputType | null;
    _sum: WatchedSourceSumAggregateOutputType | null;
    _min: WatchedSourceMinAggregateOutputType | null;
    _max: WatchedSourceMaxAggregateOutputType | null;
};
export type WatchedSourceAvgAggregateOutputType = {
    position: number | null;
};
export type WatchedSourceSumAggregateOutputType = {
    position: number | null;
};
export type WatchedSourceMinAggregateOutputType = {
    id: string | null;
    userId: string | null;
    url: string | null;
    label: string | null;
    resolver: string | null;
    fetchedAt: Date | null;
    lastError: string | null;
    position: number | null;
    createdAt: Date | null;
};
export type WatchedSourceMaxAggregateOutputType = {
    id: string | null;
    userId: string | null;
    url: string | null;
    label: string | null;
    resolver: string | null;
    fetchedAt: Date | null;
    lastError: string | null;
    position: number | null;
    createdAt: Date | null;
};
export type WatchedSourceCountAggregateOutputType = {
    id: number;
    userId: number;
    url: number;
    label: number;
    resolver: number;
    items: number;
    fetchedAt: number;
    lastError: number;
    position: number;
    createdAt: number;
    _all: number;
};
export type WatchedSourceAvgAggregateInputType = {
    position?: true;
};
export type WatchedSourceSumAggregateInputType = {
    position?: true;
};
export type WatchedSourceMinAggregateInputType = {
    id?: true;
    userId?: true;
    url?: true;
    label?: true;
    resolver?: true;
    fetchedAt?: true;
    lastError?: true;
    position?: true;
    createdAt?: true;
};
export type WatchedSourceMaxAggregateInputType = {
    id?: true;
    userId?: true;
    url?: true;
    label?: true;
    resolver?: true;
    fetchedAt?: true;
    lastError?: true;
    position?: true;
    createdAt?: true;
};
export type WatchedSourceCountAggregateInputType = {
    id?: true;
    userId?: true;
    url?: true;
    label?: true;
    resolver?: true;
    items?: true;
    fetchedAt?: true;
    lastError?: true;
    position?: true;
    createdAt?: true;
    _all?: true;
};
export type WatchedSourceAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.WatchedSourceWhereInput;
    orderBy?: Prisma.WatchedSourceOrderByWithRelationInput | Prisma.WatchedSourceOrderByWithRelationInput[];
    cursor?: Prisma.WatchedSourceWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | WatchedSourceCountAggregateInputType;
    _avg?: WatchedSourceAvgAggregateInputType;
    _sum?: WatchedSourceSumAggregateInputType;
    _min?: WatchedSourceMinAggregateInputType;
    _max?: WatchedSourceMaxAggregateInputType;
};
export type GetWatchedSourceAggregateType<T extends WatchedSourceAggregateArgs> = {
    [P in keyof T & keyof AggregateWatchedSource]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateWatchedSource[P]> : Prisma.GetScalarType<T[P], AggregateWatchedSource[P]>;
};
export type WatchedSourceGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.WatchedSourceWhereInput;
    orderBy?: Prisma.WatchedSourceOrderByWithAggregationInput | Prisma.WatchedSourceOrderByWithAggregationInput[];
    by: Prisma.WatchedSourceScalarFieldEnum[] | Prisma.WatchedSourceScalarFieldEnum;
    having?: Prisma.WatchedSourceScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: WatchedSourceCountAggregateInputType | true;
    _avg?: WatchedSourceAvgAggregateInputType;
    _sum?: WatchedSourceSumAggregateInputType;
    _min?: WatchedSourceMinAggregateInputType;
    _max?: WatchedSourceMaxAggregateInputType;
};
export type WatchedSourceGroupByOutputType = {
    id: string;
    userId: string;
    url: string;
    label: string;
    resolver: string;
    items: runtime.JsonValue;
    fetchedAt: Date | null;
    lastError: string | null;
    position: number;
    createdAt: Date;
    _count: WatchedSourceCountAggregateOutputType | null;
    _avg: WatchedSourceAvgAggregateOutputType | null;
    _sum: WatchedSourceSumAggregateOutputType | null;
    _min: WatchedSourceMinAggregateOutputType | null;
    _max: WatchedSourceMaxAggregateOutputType | null;
};
export type GetWatchedSourceGroupByPayload<T extends WatchedSourceGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<WatchedSourceGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof WatchedSourceGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], WatchedSourceGroupByOutputType[P]> : Prisma.GetScalarType<T[P], WatchedSourceGroupByOutputType[P]>;
}>>;
export type WatchedSourceWhereInput = {
    AND?: Prisma.WatchedSourceWhereInput | Prisma.WatchedSourceWhereInput[];
    OR?: Prisma.WatchedSourceWhereInput[];
    NOT?: Prisma.WatchedSourceWhereInput | Prisma.WatchedSourceWhereInput[];
    id?: Prisma.StringFilter<"WatchedSource"> | string;
    userId?: Prisma.StringFilter<"WatchedSource"> | string;
    url?: Prisma.StringFilter<"WatchedSource"> | string;
    label?: Prisma.StringFilter<"WatchedSource"> | string;
    resolver?: Prisma.StringFilter<"WatchedSource"> | string;
    items?: Prisma.JsonFilter<"WatchedSource">;
    fetchedAt?: Prisma.DateTimeNullableFilter<"WatchedSource"> | Date | string | null;
    lastError?: Prisma.StringNullableFilter<"WatchedSource"> | string | null;
    position?: Prisma.IntFilter<"WatchedSource"> | number;
    createdAt?: Prisma.DateTimeFilter<"WatchedSource"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
};
export type WatchedSourceOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    url?: Prisma.SortOrder;
    label?: Prisma.SortOrder;
    resolver?: Prisma.SortOrder;
    items?: Prisma.SortOrder;
    fetchedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastError?: Prisma.SortOrderInput | Prisma.SortOrder;
    position?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    user?: Prisma.UserOrderByWithRelationInput;
};
export type WatchedSourceWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    userId_url?: Prisma.WatchedSourceUserIdUrlCompoundUniqueInput;
    AND?: Prisma.WatchedSourceWhereInput | Prisma.WatchedSourceWhereInput[];
    OR?: Prisma.WatchedSourceWhereInput[];
    NOT?: Prisma.WatchedSourceWhereInput | Prisma.WatchedSourceWhereInput[];
    userId?: Prisma.StringFilter<"WatchedSource"> | string;
    url?: Prisma.StringFilter<"WatchedSource"> | string;
    label?: Prisma.StringFilter<"WatchedSource"> | string;
    resolver?: Prisma.StringFilter<"WatchedSource"> | string;
    items?: Prisma.JsonFilter<"WatchedSource">;
    fetchedAt?: Prisma.DateTimeNullableFilter<"WatchedSource"> | Date | string | null;
    lastError?: Prisma.StringNullableFilter<"WatchedSource"> | string | null;
    position?: Prisma.IntFilter<"WatchedSource"> | number;
    createdAt?: Prisma.DateTimeFilter<"WatchedSource"> | Date | string;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
}, "id" | "userId_url">;
export type WatchedSourceOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    url?: Prisma.SortOrder;
    label?: Prisma.SortOrder;
    resolver?: Prisma.SortOrder;
    items?: Prisma.SortOrder;
    fetchedAt?: Prisma.SortOrderInput | Prisma.SortOrder;
    lastError?: Prisma.SortOrderInput | Prisma.SortOrder;
    position?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    _count?: Prisma.WatchedSourceCountOrderByAggregateInput;
    _avg?: Prisma.WatchedSourceAvgOrderByAggregateInput;
    _max?: Prisma.WatchedSourceMaxOrderByAggregateInput;
    _min?: Prisma.WatchedSourceMinOrderByAggregateInput;
    _sum?: Prisma.WatchedSourceSumOrderByAggregateInput;
};
export type WatchedSourceScalarWhereWithAggregatesInput = {
    AND?: Prisma.WatchedSourceScalarWhereWithAggregatesInput | Prisma.WatchedSourceScalarWhereWithAggregatesInput[];
    OR?: Prisma.WatchedSourceScalarWhereWithAggregatesInput[];
    NOT?: Prisma.WatchedSourceScalarWhereWithAggregatesInput | Prisma.WatchedSourceScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"WatchedSource"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"WatchedSource"> | string;
    url?: Prisma.StringWithAggregatesFilter<"WatchedSource"> | string;
    label?: Prisma.StringWithAggregatesFilter<"WatchedSource"> | string;
    resolver?: Prisma.StringWithAggregatesFilter<"WatchedSource"> | string;
    items?: Prisma.JsonWithAggregatesFilter<"WatchedSource">;
    fetchedAt?: Prisma.DateTimeNullableWithAggregatesFilter<"WatchedSource"> | Date | string | null;
    lastError?: Prisma.StringNullableWithAggregatesFilter<"WatchedSource"> | string | null;
    position?: Prisma.IntWithAggregatesFilter<"WatchedSource"> | number;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"WatchedSource"> | Date | string;
};
export type WatchedSourceCreateInput = {
    id?: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutWatchedSourcesInput;
};
export type WatchedSourceUncheckedCreateInput = {
    id?: string;
    userId: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
};
export type WatchedSourceUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutWatchedSourcesNestedInput;
};
export type WatchedSourceUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceCreateManyInput = {
    id?: string;
    userId: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
};
export type WatchedSourceUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceListRelationFilter = {
    every?: Prisma.WatchedSourceWhereInput;
    some?: Prisma.WatchedSourceWhereInput;
    none?: Prisma.WatchedSourceWhereInput;
};
export type WatchedSourceOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type WatchedSourceUserIdUrlCompoundUniqueInput = {
    userId: string;
    url: string;
};
export type WatchedSourceCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    url?: Prisma.SortOrder;
    label?: Prisma.SortOrder;
    resolver?: Prisma.SortOrder;
    items?: Prisma.SortOrder;
    fetchedAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type WatchedSourceAvgOrderByAggregateInput = {
    position?: Prisma.SortOrder;
};
export type WatchedSourceMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    url?: Prisma.SortOrder;
    label?: Prisma.SortOrder;
    resolver?: Prisma.SortOrder;
    fetchedAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type WatchedSourceMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    url?: Prisma.SortOrder;
    label?: Prisma.SortOrder;
    resolver?: Prisma.SortOrder;
    fetchedAt?: Prisma.SortOrder;
    lastError?: Prisma.SortOrder;
    position?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
};
export type WatchedSourceSumOrderByAggregateInput = {
    position?: Prisma.SortOrder;
};
export type WatchedSourceCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput> | Prisma.WatchedSourceCreateWithoutUserInput[] | Prisma.WatchedSourceUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.WatchedSourceCreateOrConnectWithoutUserInput | Prisma.WatchedSourceCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.WatchedSourceCreateManyUserInputEnvelope;
    connect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
};
export type WatchedSourceUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput> | Prisma.WatchedSourceCreateWithoutUserInput[] | Prisma.WatchedSourceUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.WatchedSourceCreateOrConnectWithoutUserInput | Prisma.WatchedSourceCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.WatchedSourceCreateManyUserInputEnvelope;
    connect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
};
export type WatchedSourceUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput> | Prisma.WatchedSourceCreateWithoutUserInput[] | Prisma.WatchedSourceUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.WatchedSourceCreateOrConnectWithoutUserInput | Prisma.WatchedSourceCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.WatchedSourceUpsertWithWhereUniqueWithoutUserInput | Prisma.WatchedSourceUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.WatchedSourceCreateManyUserInputEnvelope;
    set?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    disconnect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    delete?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    connect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    update?: Prisma.WatchedSourceUpdateWithWhereUniqueWithoutUserInput | Prisma.WatchedSourceUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.WatchedSourceUpdateManyWithWhereWithoutUserInput | Prisma.WatchedSourceUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.WatchedSourceScalarWhereInput | Prisma.WatchedSourceScalarWhereInput[];
};
export type WatchedSourceUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput> | Prisma.WatchedSourceCreateWithoutUserInput[] | Prisma.WatchedSourceUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.WatchedSourceCreateOrConnectWithoutUserInput | Prisma.WatchedSourceCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.WatchedSourceUpsertWithWhereUniqueWithoutUserInput | Prisma.WatchedSourceUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.WatchedSourceCreateManyUserInputEnvelope;
    set?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    disconnect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    delete?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    connect?: Prisma.WatchedSourceWhereUniqueInput | Prisma.WatchedSourceWhereUniqueInput[];
    update?: Prisma.WatchedSourceUpdateWithWhereUniqueWithoutUserInput | Prisma.WatchedSourceUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.WatchedSourceUpdateManyWithWhereWithoutUserInput | Prisma.WatchedSourceUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.WatchedSourceScalarWhereInput | Prisma.WatchedSourceScalarWhereInput[];
};
export type WatchedSourceCreateWithoutUserInput = {
    id?: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
};
export type WatchedSourceUncheckedCreateWithoutUserInput = {
    id?: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
};
export type WatchedSourceCreateOrConnectWithoutUserInput = {
    where: Prisma.WatchedSourceWhereUniqueInput;
    create: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput>;
};
export type WatchedSourceCreateManyUserInputEnvelope = {
    data: Prisma.WatchedSourceCreateManyUserInput | Prisma.WatchedSourceCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type WatchedSourceUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.WatchedSourceWhereUniqueInput;
    update: Prisma.XOR<Prisma.WatchedSourceUpdateWithoutUserInput, Prisma.WatchedSourceUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.WatchedSourceCreateWithoutUserInput, Prisma.WatchedSourceUncheckedCreateWithoutUserInput>;
};
export type WatchedSourceUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.WatchedSourceWhereUniqueInput;
    data: Prisma.XOR<Prisma.WatchedSourceUpdateWithoutUserInput, Prisma.WatchedSourceUncheckedUpdateWithoutUserInput>;
};
export type WatchedSourceUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.WatchedSourceScalarWhereInput;
    data: Prisma.XOR<Prisma.WatchedSourceUpdateManyMutationInput, Prisma.WatchedSourceUncheckedUpdateManyWithoutUserInput>;
};
export type WatchedSourceScalarWhereInput = {
    AND?: Prisma.WatchedSourceScalarWhereInput | Prisma.WatchedSourceScalarWhereInput[];
    OR?: Prisma.WatchedSourceScalarWhereInput[];
    NOT?: Prisma.WatchedSourceScalarWhereInput | Prisma.WatchedSourceScalarWhereInput[];
    id?: Prisma.StringFilter<"WatchedSource"> | string;
    userId?: Prisma.StringFilter<"WatchedSource"> | string;
    url?: Prisma.StringFilter<"WatchedSource"> | string;
    label?: Prisma.StringFilter<"WatchedSource"> | string;
    resolver?: Prisma.StringFilter<"WatchedSource"> | string;
    items?: Prisma.JsonFilter<"WatchedSource">;
    fetchedAt?: Prisma.DateTimeNullableFilter<"WatchedSource"> | Date | string | null;
    lastError?: Prisma.StringNullableFilter<"WatchedSource"> | string | null;
    position?: Prisma.IntFilter<"WatchedSource"> | number;
    createdAt?: Prisma.DateTimeFilter<"WatchedSource"> | Date | string;
};
export type WatchedSourceCreateManyUserInput = {
    id?: string;
    url: string;
    label: string;
    resolver: string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Date | string | null;
    lastError?: string | null;
    position: number;
    createdAt?: Date | string;
};
export type WatchedSourceUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    url?: Prisma.StringFieldUpdateOperationsInput | string;
    label?: Prisma.StringFieldUpdateOperationsInput | string;
    resolver?: Prisma.StringFieldUpdateOperationsInput | string;
    items?: Prisma.JsonNullValueInput | runtime.InputJsonValue;
    fetchedAt?: Prisma.NullableDateTimeFieldUpdateOperationsInput | Date | string | null;
    lastError?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    position?: Prisma.IntFieldUpdateOperationsInput | number;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type WatchedSourceSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    url?: boolean;
    label?: boolean;
    resolver?: boolean;
    items?: boolean;
    fetchedAt?: boolean;
    lastError?: boolean;
    position?: boolean;
    createdAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["watchedSource"]>;
export type WatchedSourceSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    url?: boolean;
    label?: boolean;
    resolver?: boolean;
    items?: boolean;
    fetchedAt?: boolean;
    lastError?: boolean;
    position?: boolean;
    createdAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["watchedSource"]>;
export type WatchedSourceSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    userId?: boolean;
    url?: boolean;
    label?: boolean;
    resolver?: boolean;
    items?: boolean;
    fetchedAt?: boolean;
    lastError?: boolean;
    position?: boolean;
    createdAt?: boolean;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["watchedSource"]>;
export type WatchedSourceSelectScalar = {
    id?: boolean;
    userId?: boolean;
    url?: boolean;
    label?: boolean;
    resolver?: boolean;
    items?: boolean;
    fetchedAt?: boolean;
    lastError?: boolean;
    position?: boolean;
    createdAt?: boolean;
};
export type WatchedSourceOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "userId" | "url" | "label" | "resolver" | "items" | "fetchedAt" | "lastError" | "position" | "createdAt", ExtArgs["result"]["watchedSource"]>;
export type WatchedSourceInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type WatchedSourceIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type WatchedSourceIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
};
export type $WatchedSourcePayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "WatchedSource";
    objects: {
        user: Prisma.$UserPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        userId: string;
        url: string;
        label: string;
        resolver: string;
        items: runtime.JsonValue;
        fetchedAt: Date | null;
        lastError: string | null;
        position: number;
        createdAt: Date;
    }, ExtArgs["result"]["watchedSource"]>;
    composites: {};
};
export type WatchedSourceGetPayload<S extends boolean | null | undefined | WatchedSourceDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload, S>;
export type WatchedSourceCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<WatchedSourceFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: WatchedSourceCountAggregateInputType | true;
};
export interface WatchedSourceDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['WatchedSource'];
        meta: {
            name: 'WatchedSource';
        };
    };
    findUnique<T extends WatchedSourceFindUniqueArgs>(args: Prisma.SelectSubset<T, WatchedSourceFindUniqueArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends WatchedSourceFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, WatchedSourceFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends WatchedSourceFindFirstArgs>(args?: Prisma.SelectSubset<T, WatchedSourceFindFirstArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends WatchedSourceFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, WatchedSourceFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends WatchedSourceFindManyArgs>(args?: Prisma.SelectSubset<T, WatchedSourceFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends WatchedSourceCreateArgs>(args: Prisma.SelectSubset<T, WatchedSourceCreateArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends WatchedSourceCreateManyArgs>(args?: Prisma.SelectSubset<T, WatchedSourceCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends WatchedSourceCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, WatchedSourceCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends WatchedSourceDeleteArgs>(args: Prisma.SelectSubset<T, WatchedSourceDeleteArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends WatchedSourceUpdateArgs>(args: Prisma.SelectSubset<T, WatchedSourceUpdateArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends WatchedSourceDeleteManyArgs>(args?: Prisma.SelectSubset<T, WatchedSourceDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends WatchedSourceUpdateManyArgs>(args: Prisma.SelectSubset<T, WatchedSourceUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends WatchedSourceUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, WatchedSourceUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends WatchedSourceUpsertArgs>(args: Prisma.SelectSubset<T, WatchedSourceUpsertArgs<ExtArgs>>): Prisma.Prisma__WatchedSourceClient<runtime.Types.Result.GetResult<Prisma.$WatchedSourcePayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends WatchedSourceCountArgs>(args?: Prisma.Subset<T, WatchedSourceCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], WatchedSourceCountAggregateOutputType> : number>;
    aggregate<T extends WatchedSourceAggregateArgs>(args: Prisma.Subset<T, WatchedSourceAggregateArgs>): Prisma.PrismaPromise<GetWatchedSourceAggregateType<T>>;
    groupBy<T extends WatchedSourceGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: WatchedSourceGroupByArgs['orderBy'];
    } : {
        orderBy?: WatchedSourceGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, WatchedSourceGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetWatchedSourceGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: WatchedSourceFieldRefs;
}
export interface Prisma__WatchedSourceClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface WatchedSourceFieldRefs {
    readonly id: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly userId: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly url: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly label: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly resolver: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly items: Prisma.FieldRef<"WatchedSource", 'Json'>;
    readonly fetchedAt: Prisma.FieldRef<"WatchedSource", 'DateTime'>;
    readonly lastError: Prisma.FieldRef<"WatchedSource", 'String'>;
    readonly position: Prisma.FieldRef<"WatchedSource", 'Int'>;
    readonly createdAt: Prisma.FieldRef<"WatchedSource", 'DateTime'>;
}
export type WatchedSourceFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where: Prisma.WatchedSourceWhereUniqueInput;
};
export type WatchedSourceFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where: Prisma.WatchedSourceWhereUniqueInput;
};
export type WatchedSourceFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where?: Prisma.WatchedSourceWhereInput;
    orderBy?: Prisma.WatchedSourceOrderByWithRelationInput | Prisma.WatchedSourceOrderByWithRelationInput[];
    cursor?: Prisma.WatchedSourceWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.WatchedSourceScalarFieldEnum | Prisma.WatchedSourceScalarFieldEnum[];
};
export type WatchedSourceFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where?: Prisma.WatchedSourceWhereInput;
    orderBy?: Prisma.WatchedSourceOrderByWithRelationInput | Prisma.WatchedSourceOrderByWithRelationInput[];
    cursor?: Prisma.WatchedSourceWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.WatchedSourceScalarFieldEnum | Prisma.WatchedSourceScalarFieldEnum[];
};
export type WatchedSourceFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where?: Prisma.WatchedSourceWhereInput;
    orderBy?: Prisma.WatchedSourceOrderByWithRelationInput | Prisma.WatchedSourceOrderByWithRelationInput[];
    cursor?: Prisma.WatchedSourceWhereUniqueInput;
    take?: number;
    skip?: number;
    distinct?: Prisma.WatchedSourceScalarFieldEnum | Prisma.WatchedSourceScalarFieldEnum[];
};
export type WatchedSourceCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.WatchedSourceCreateInput, Prisma.WatchedSourceUncheckedCreateInput>;
};
export type WatchedSourceCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.WatchedSourceCreateManyInput | Prisma.WatchedSourceCreateManyInput[];
    skipDuplicates?: boolean;
};
export type WatchedSourceCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    data: Prisma.WatchedSourceCreateManyInput | Prisma.WatchedSourceCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.WatchedSourceIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type WatchedSourceUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.WatchedSourceUpdateInput, Prisma.WatchedSourceUncheckedUpdateInput>;
    where: Prisma.WatchedSourceWhereUniqueInput;
};
export type WatchedSourceUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.WatchedSourceUpdateManyMutationInput, Prisma.WatchedSourceUncheckedUpdateManyInput>;
    where?: Prisma.WatchedSourceWhereInput;
    limit?: number;
};
export type WatchedSourceUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.WatchedSourceUpdateManyMutationInput, Prisma.WatchedSourceUncheckedUpdateManyInput>;
    where?: Prisma.WatchedSourceWhereInput;
    limit?: number;
    include?: Prisma.WatchedSourceIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type WatchedSourceUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where: Prisma.WatchedSourceWhereUniqueInput;
    create: Prisma.XOR<Prisma.WatchedSourceCreateInput, Prisma.WatchedSourceUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.WatchedSourceUpdateInput, Prisma.WatchedSourceUncheckedUpdateInput>;
};
export type WatchedSourceDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
    where: Prisma.WatchedSourceWhereUniqueInput;
};
export type WatchedSourceDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.WatchedSourceWhereInput;
    limit?: number;
};
export type WatchedSourceDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.WatchedSourceSelect<ExtArgs> | null;
    omit?: Prisma.WatchedSourceOmit<ExtArgs> | null;
    include?: Prisma.WatchedSourceInclude<ExtArgs> | null;
};
