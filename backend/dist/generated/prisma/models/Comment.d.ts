import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type CommentModel = runtime.Types.Result.DefaultSelection<Prisma.$CommentPayload>;
export type AggregateComment = {
    _count: CommentCountAggregateOutputType | null;
    _avg: CommentAvgAggregateOutputType | null;
    _sum: CommentSumAggregateOutputType | null;
    _min: CommentMinAggregateOutputType | null;
    _max: CommentMaxAggregateOutputType | null;
};
export type CommentAvgAggregateOutputType = {
    timecodeSec: number | null;
};
export type CommentSumAggregateOutputType = {
    timecodeSec: number | null;
};
export type CommentMinAggregateOutputType = {
    id: string | null;
    body: string | null;
    timecodeSec: number | null;
    createdAt: Date | null;
    mixId: string | null;
    userId: string | null;
    parentId: string | null;
};
export type CommentMaxAggregateOutputType = {
    id: string | null;
    body: string | null;
    timecodeSec: number | null;
    createdAt: Date | null;
    mixId: string | null;
    userId: string | null;
    parentId: string | null;
};
export type CommentCountAggregateOutputType = {
    id: number;
    body: number;
    timecodeSec: number;
    createdAt: number;
    mixId: number;
    userId: number;
    parentId: number;
    _all: number;
};
export type CommentAvgAggregateInputType = {
    timecodeSec?: true;
};
export type CommentSumAggregateInputType = {
    timecodeSec?: true;
};
export type CommentMinAggregateInputType = {
    id?: true;
    body?: true;
    timecodeSec?: true;
    createdAt?: true;
    mixId?: true;
    userId?: true;
    parentId?: true;
};
export type CommentMaxAggregateInputType = {
    id?: true;
    body?: true;
    timecodeSec?: true;
    createdAt?: true;
    mixId?: true;
    userId?: true;
    parentId?: true;
};
export type CommentCountAggregateInputType = {
    id?: true;
    body?: true;
    timecodeSec?: true;
    createdAt?: true;
    mixId?: true;
    userId?: true;
    parentId?: true;
    _all?: true;
};
export type CommentAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CommentWhereInput;
    orderBy?: Prisma.CommentOrderByWithRelationInput | Prisma.CommentOrderByWithRelationInput[];
    cursor?: Prisma.CommentWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | CommentCountAggregateInputType;
    _avg?: CommentAvgAggregateInputType;
    _sum?: CommentSumAggregateInputType;
    _min?: CommentMinAggregateInputType;
    _max?: CommentMaxAggregateInputType;
};
export type GetCommentAggregateType<T extends CommentAggregateArgs> = {
    [P in keyof T & keyof AggregateComment]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateComment[P]> : Prisma.GetScalarType<T[P], AggregateComment[P]>;
};
export type CommentGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CommentWhereInput;
    orderBy?: Prisma.CommentOrderByWithAggregationInput | Prisma.CommentOrderByWithAggregationInput[];
    by: Prisma.CommentScalarFieldEnum[] | Prisma.CommentScalarFieldEnum;
    having?: Prisma.CommentScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: CommentCountAggregateInputType | true;
    _avg?: CommentAvgAggregateInputType;
    _sum?: CommentSumAggregateInputType;
    _min?: CommentMinAggregateInputType;
    _max?: CommentMaxAggregateInputType;
};
export type CommentGroupByOutputType = {
    id: string;
    body: string;
    timecodeSec: number | null;
    createdAt: Date;
    mixId: string;
    userId: string;
    parentId: string | null;
    _count: CommentCountAggregateOutputType | null;
    _avg: CommentAvgAggregateOutputType | null;
    _sum: CommentSumAggregateOutputType | null;
    _min: CommentMinAggregateOutputType | null;
    _max: CommentMaxAggregateOutputType | null;
};
export type GetCommentGroupByPayload<T extends CommentGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<CommentGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof CommentGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], CommentGroupByOutputType[P]> : Prisma.GetScalarType<T[P], CommentGroupByOutputType[P]>;
}>>;
export type CommentWhereInput = {
    AND?: Prisma.CommentWhereInput | Prisma.CommentWhereInput[];
    OR?: Prisma.CommentWhereInput[];
    NOT?: Prisma.CommentWhereInput | Prisma.CommentWhereInput[];
    id?: Prisma.StringFilter<"Comment"> | string;
    body?: Prisma.StringFilter<"Comment"> | string;
    timecodeSec?: Prisma.IntNullableFilter<"Comment"> | number | null;
    createdAt?: Prisma.DateTimeFilter<"Comment"> | Date | string;
    mixId?: Prisma.StringFilter<"Comment"> | string;
    userId?: Prisma.StringFilter<"Comment"> | string;
    parentId?: Prisma.StringNullableFilter<"Comment"> | string | null;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    parent?: Prisma.XOR<Prisma.CommentNullableScalarRelationFilter, Prisma.CommentWhereInput> | null;
    replies?: Prisma.CommentListRelationFilter;
};
export type CommentOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    parentId?: Prisma.SortOrderInput | Prisma.SortOrder;
    mix?: Prisma.MixOrderByWithRelationInput;
    user?: Prisma.UserOrderByWithRelationInput;
    parent?: Prisma.CommentOrderByWithRelationInput;
    replies?: Prisma.CommentOrderByRelationAggregateInput;
};
export type CommentWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.CommentWhereInput | Prisma.CommentWhereInput[];
    OR?: Prisma.CommentWhereInput[];
    NOT?: Prisma.CommentWhereInput | Prisma.CommentWhereInput[];
    body?: Prisma.StringFilter<"Comment"> | string;
    timecodeSec?: Prisma.IntNullableFilter<"Comment"> | number | null;
    createdAt?: Prisma.DateTimeFilter<"Comment"> | Date | string;
    mixId?: Prisma.StringFilter<"Comment"> | string;
    userId?: Prisma.StringFilter<"Comment"> | string;
    parentId?: Prisma.StringNullableFilter<"Comment"> | string | null;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
    user?: Prisma.XOR<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput>;
    parent?: Prisma.XOR<Prisma.CommentNullableScalarRelationFilter, Prisma.CommentWhereInput> | null;
    replies?: Prisma.CommentListRelationFilter;
}, "id">;
export type CommentOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrderInput | Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    parentId?: Prisma.SortOrderInput | Prisma.SortOrder;
    _count?: Prisma.CommentCountOrderByAggregateInput;
    _avg?: Prisma.CommentAvgOrderByAggregateInput;
    _max?: Prisma.CommentMaxOrderByAggregateInput;
    _min?: Prisma.CommentMinOrderByAggregateInput;
    _sum?: Prisma.CommentSumOrderByAggregateInput;
};
export type CommentScalarWhereWithAggregatesInput = {
    AND?: Prisma.CommentScalarWhereWithAggregatesInput | Prisma.CommentScalarWhereWithAggregatesInput[];
    OR?: Prisma.CommentScalarWhereWithAggregatesInput[];
    NOT?: Prisma.CommentScalarWhereWithAggregatesInput | Prisma.CommentScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"Comment"> | string;
    body?: Prisma.StringWithAggregatesFilter<"Comment"> | string;
    timecodeSec?: Prisma.IntNullableWithAggregatesFilter<"Comment"> | number | null;
    createdAt?: Prisma.DateTimeWithAggregatesFilter<"Comment"> | Date | string;
    mixId?: Prisma.StringWithAggregatesFilter<"Comment"> | string;
    userId?: Prisma.StringWithAggregatesFilter<"Comment"> | string;
    parentId?: Prisma.StringNullableWithAggregatesFilter<"Comment"> | string | null;
};
export type CommentCreateInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutCommentsInput;
    user: Prisma.UserCreateNestedOneWithoutCommentsInput;
    parent?: Prisma.CommentCreateNestedOneWithoutRepliesInput;
    replies?: Prisma.CommentCreateNestedManyWithoutParentInput;
};
export type CommentUncheckedCreateInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    userId: string;
    parentId?: string | null;
    replies?: Prisma.CommentUncheckedCreateNestedManyWithoutParentInput;
};
export type CommentUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutCommentsNestedInput;
    user?: Prisma.UserUpdateOneRequiredWithoutCommentsNestedInput;
    parent?: Prisma.CommentUpdateOneWithoutRepliesNestedInput;
    replies?: Prisma.CommentUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    replies?: Prisma.CommentUncheckedUpdateManyWithoutParentNestedInput;
};
export type CommentCreateManyInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    userId: string;
    parentId?: string | null;
};
export type CommentUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
};
export type CommentUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
};
export type CommentListRelationFilter = {
    every?: Prisma.CommentWhereInput;
    some?: Prisma.CommentWhereInput;
    none?: Prisma.CommentWhereInput;
};
export type CommentOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type CommentNullableScalarRelationFilter = {
    is?: Prisma.CommentWhereInput | null;
    isNot?: Prisma.CommentWhereInput | null;
};
export type CommentCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
};
export type CommentAvgOrderByAggregateInput = {
    timecodeSec?: Prisma.SortOrder;
};
export type CommentMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
};
export type CommentMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    body?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    createdAt?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    userId?: Prisma.SortOrder;
    parentId?: Prisma.SortOrder;
};
export type CommentSumOrderByAggregateInput = {
    timecodeSec?: Prisma.SortOrder;
};
export type CommentCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput> | Prisma.CommentCreateWithoutUserInput[] | Prisma.CommentUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutUserInput | Prisma.CommentCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.CommentCreateManyUserInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUncheckedCreateNestedManyWithoutUserInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput> | Prisma.CommentCreateWithoutUserInput[] | Prisma.CommentUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutUserInput | Prisma.CommentCreateOrConnectWithoutUserInput[];
    createMany?: Prisma.CommentCreateManyUserInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput> | Prisma.CommentCreateWithoutUserInput[] | Prisma.CommentUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutUserInput | Prisma.CommentCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutUserInput | Prisma.CommentUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.CommentCreateManyUserInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutUserInput | Prisma.CommentUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutUserInput | Prisma.CommentUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentUncheckedUpdateManyWithoutUserNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput> | Prisma.CommentCreateWithoutUserInput[] | Prisma.CommentUncheckedCreateWithoutUserInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutUserInput | Prisma.CommentCreateOrConnectWithoutUserInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutUserInput | Prisma.CommentUpsertWithWhereUniqueWithoutUserInput[];
    createMany?: Prisma.CommentCreateManyUserInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutUserInput | Prisma.CommentUpdateWithWhereUniqueWithoutUserInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutUserInput | Prisma.CommentUpdateManyWithWhereWithoutUserInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput> | Prisma.CommentCreateWithoutMixInput[] | Prisma.CommentUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutMixInput | Prisma.CommentCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.CommentCreateManyMixInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUncheckedCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput> | Prisma.CommentCreateWithoutMixInput[] | Prisma.CommentUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutMixInput | Prisma.CommentCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.CommentCreateManyMixInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput> | Prisma.CommentCreateWithoutMixInput[] | Prisma.CommentUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutMixInput | Prisma.CommentCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutMixInput | Prisma.CommentUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.CommentCreateManyMixInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutMixInput | Prisma.CommentUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutMixInput | Prisma.CommentUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentUncheckedUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput> | Prisma.CommentCreateWithoutMixInput[] | Prisma.CommentUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutMixInput | Prisma.CommentCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutMixInput | Prisma.CommentUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.CommentCreateManyMixInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutMixInput | Prisma.CommentUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutMixInput | Prisma.CommentUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentCreateNestedOneWithoutRepliesInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutRepliesInput, Prisma.CommentUncheckedCreateWithoutRepliesInput>;
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutRepliesInput;
    connect?: Prisma.CommentWhereUniqueInput;
};
export type CommentCreateNestedManyWithoutParentInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput> | Prisma.CommentCreateWithoutParentInput[] | Prisma.CommentUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutParentInput | Prisma.CommentCreateOrConnectWithoutParentInput[];
    createMany?: Prisma.CommentCreateManyParentInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUncheckedCreateNestedManyWithoutParentInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput> | Prisma.CommentCreateWithoutParentInput[] | Prisma.CommentUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutParentInput | Prisma.CommentCreateOrConnectWithoutParentInput[];
    createMany?: Prisma.CommentCreateManyParentInputEnvelope;
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
};
export type CommentUpdateOneWithoutRepliesNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutRepliesInput, Prisma.CommentUncheckedCreateWithoutRepliesInput>;
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutRepliesInput;
    upsert?: Prisma.CommentUpsertWithoutRepliesInput;
    disconnect?: Prisma.CommentWhereInput | boolean;
    delete?: Prisma.CommentWhereInput | boolean;
    connect?: Prisma.CommentWhereUniqueInput;
    update?: Prisma.XOR<Prisma.XOR<Prisma.CommentUpdateToOneWithWhereWithoutRepliesInput, Prisma.CommentUpdateWithoutRepliesInput>, Prisma.CommentUncheckedUpdateWithoutRepliesInput>;
};
export type CommentUpdateManyWithoutParentNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput> | Prisma.CommentCreateWithoutParentInput[] | Prisma.CommentUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutParentInput | Prisma.CommentCreateOrConnectWithoutParentInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutParentInput | Prisma.CommentUpsertWithWhereUniqueWithoutParentInput[];
    createMany?: Prisma.CommentCreateManyParentInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutParentInput | Prisma.CommentUpdateWithWhereUniqueWithoutParentInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutParentInput | Prisma.CommentUpdateManyWithWhereWithoutParentInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentUncheckedUpdateManyWithoutParentNestedInput = {
    create?: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput> | Prisma.CommentCreateWithoutParentInput[] | Prisma.CommentUncheckedCreateWithoutParentInput[];
    connectOrCreate?: Prisma.CommentCreateOrConnectWithoutParentInput | Prisma.CommentCreateOrConnectWithoutParentInput[];
    upsert?: Prisma.CommentUpsertWithWhereUniqueWithoutParentInput | Prisma.CommentUpsertWithWhereUniqueWithoutParentInput[];
    createMany?: Prisma.CommentCreateManyParentInputEnvelope;
    set?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    disconnect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    delete?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    connect?: Prisma.CommentWhereUniqueInput | Prisma.CommentWhereUniqueInput[];
    update?: Prisma.CommentUpdateWithWhereUniqueWithoutParentInput | Prisma.CommentUpdateWithWhereUniqueWithoutParentInput[];
    updateMany?: Prisma.CommentUpdateManyWithWhereWithoutParentInput | Prisma.CommentUpdateManyWithWhereWithoutParentInput[];
    deleteMany?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
};
export type CommentCreateWithoutUserInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutCommentsInput;
    parent?: Prisma.CommentCreateNestedOneWithoutRepliesInput;
    replies?: Prisma.CommentCreateNestedManyWithoutParentInput;
};
export type CommentUncheckedCreateWithoutUserInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    parentId?: string | null;
    replies?: Prisma.CommentUncheckedCreateNestedManyWithoutParentInput;
};
export type CommentCreateOrConnectWithoutUserInput = {
    where: Prisma.CommentWhereUniqueInput;
    create: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput>;
};
export type CommentCreateManyUserInputEnvelope = {
    data: Prisma.CommentCreateManyUserInput | Prisma.CommentCreateManyUserInput[];
    skipDuplicates?: boolean;
};
export type CommentUpsertWithWhereUniqueWithoutUserInput = {
    where: Prisma.CommentWhereUniqueInput;
    update: Prisma.XOR<Prisma.CommentUpdateWithoutUserInput, Prisma.CommentUncheckedUpdateWithoutUserInput>;
    create: Prisma.XOR<Prisma.CommentCreateWithoutUserInput, Prisma.CommentUncheckedCreateWithoutUserInput>;
};
export type CommentUpdateWithWhereUniqueWithoutUserInput = {
    where: Prisma.CommentWhereUniqueInput;
    data: Prisma.XOR<Prisma.CommentUpdateWithoutUserInput, Prisma.CommentUncheckedUpdateWithoutUserInput>;
};
export type CommentUpdateManyWithWhereWithoutUserInput = {
    where: Prisma.CommentScalarWhereInput;
    data: Prisma.XOR<Prisma.CommentUpdateManyMutationInput, Prisma.CommentUncheckedUpdateManyWithoutUserInput>;
};
export type CommentScalarWhereInput = {
    AND?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
    OR?: Prisma.CommentScalarWhereInput[];
    NOT?: Prisma.CommentScalarWhereInput | Prisma.CommentScalarWhereInput[];
    id?: Prisma.StringFilter<"Comment"> | string;
    body?: Prisma.StringFilter<"Comment"> | string;
    timecodeSec?: Prisma.IntNullableFilter<"Comment"> | number | null;
    createdAt?: Prisma.DateTimeFilter<"Comment"> | Date | string;
    mixId?: Prisma.StringFilter<"Comment"> | string;
    userId?: Prisma.StringFilter<"Comment"> | string;
    parentId?: Prisma.StringNullableFilter<"Comment"> | string | null;
};
export type CommentCreateWithoutMixInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    user: Prisma.UserCreateNestedOneWithoutCommentsInput;
    parent?: Prisma.CommentCreateNestedOneWithoutRepliesInput;
    replies?: Prisma.CommentCreateNestedManyWithoutParentInput;
};
export type CommentUncheckedCreateWithoutMixInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    userId: string;
    parentId?: string | null;
    replies?: Prisma.CommentUncheckedCreateNestedManyWithoutParentInput;
};
export type CommentCreateOrConnectWithoutMixInput = {
    where: Prisma.CommentWhereUniqueInput;
    create: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput>;
};
export type CommentCreateManyMixInputEnvelope = {
    data: Prisma.CommentCreateManyMixInput | Prisma.CommentCreateManyMixInput[];
    skipDuplicates?: boolean;
};
export type CommentUpsertWithWhereUniqueWithoutMixInput = {
    where: Prisma.CommentWhereUniqueInput;
    update: Prisma.XOR<Prisma.CommentUpdateWithoutMixInput, Prisma.CommentUncheckedUpdateWithoutMixInput>;
    create: Prisma.XOR<Prisma.CommentCreateWithoutMixInput, Prisma.CommentUncheckedCreateWithoutMixInput>;
};
export type CommentUpdateWithWhereUniqueWithoutMixInput = {
    where: Prisma.CommentWhereUniqueInput;
    data: Prisma.XOR<Prisma.CommentUpdateWithoutMixInput, Prisma.CommentUncheckedUpdateWithoutMixInput>;
};
export type CommentUpdateManyWithWhereWithoutMixInput = {
    where: Prisma.CommentScalarWhereInput;
    data: Prisma.XOR<Prisma.CommentUpdateManyMutationInput, Prisma.CommentUncheckedUpdateManyWithoutMixInput>;
};
export type CommentCreateWithoutRepliesInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutCommentsInput;
    user: Prisma.UserCreateNestedOneWithoutCommentsInput;
    parent?: Prisma.CommentCreateNestedOneWithoutRepliesInput;
};
export type CommentUncheckedCreateWithoutRepliesInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    userId: string;
    parentId?: string | null;
};
export type CommentCreateOrConnectWithoutRepliesInput = {
    where: Prisma.CommentWhereUniqueInput;
    create: Prisma.XOR<Prisma.CommentCreateWithoutRepliesInput, Prisma.CommentUncheckedCreateWithoutRepliesInput>;
};
export type CommentCreateWithoutParentInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mix: Prisma.MixCreateNestedOneWithoutCommentsInput;
    user: Prisma.UserCreateNestedOneWithoutCommentsInput;
    replies?: Prisma.CommentCreateNestedManyWithoutParentInput;
};
export type CommentUncheckedCreateWithoutParentInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    userId: string;
    replies?: Prisma.CommentUncheckedCreateNestedManyWithoutParentInput;
};
export type CommentCreateOrConnectWithoutParentInput = {
    where: Prisma.CommentWhereUniqueInput;
    create: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput>;
};
export type CommentCreateManyParentInputEnvelope = {
    data: Prisma.CommentCreateManyParentInput | Prisma.CommentCreateManyParentInput[];
    skipDuplicates?: boolean;
};
export type CommentUpsertWithoutRepliesInput = {
    update: Prisma.XOR<Prisma.CommentUpdateWithoutRepliesInput, Prisma.CommentUncheckedUpdateWithoutRepliesInput>;
    create: Prisma.XOR<Prisma.CommentCreateWithoutRepliesInput, Prisma.CommentUncheckedCreateWithoutRepliesInput>;
    where?: Prisma.CommentWhereInput;
};
export type CommentUpdateToOneWithWhereWithoutRepliesInput = {
    where?: Prisma.CommentWhereInput;
    data: Prisma.XOR<Prisma.CommentUpdateWithoutRepliesInput, Prisma.CommentUncheckedUpdateWithoutRepliesInput>;
};
export type CommentUpdateWithoutRepliesInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutCommentsNestedInput;
    user?: Prisma.UserUpdateOneRequiredWithoutCommentsNestedInput;
    parent?: Prisma.CommentUpdateOneWithoutRepliesNestedInput;
};
export type CommentUncheckedUpdateWithoutRepliesInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
};
export type CommentUpsertWithWhereUniqueWithoutParentInput = {
    where: Prisma.CommentWhereUniqueInput;
    update: Prisma.XOR<Prisma.CommentUpdateWithoutParentInput, Prisma.CommentUncheckedUpdateWithoutParentInput>;
    create: Prisma.XOR<Prisma.CommentCreateWithoutParentInput, Prisma.CommentUncheckedCreateWithoutParentInput>;
};
export type CommentUpdateWithWhereUniqueWithoutParentInput = {
    where: Prisma.CommentWhereUniqueInput;
    data: Prisma.XOR<Prisma.CommentUpdateWithoutParentInput, Prisma.CommentUncheckedUpdateWithoutParentInput>;
};
export type CommentUpdateManyWithWhereWithoutParentInput = {
    where: Prisma.CommentScalarWhereInput;
    data: Prisma.XOR<Prisma.CommentUpdateManyMutationInput, Prisma.CommentUncheckedUpdateManyWithoutParentInput>;
};
export type CommentCreateManyUserInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    parentId?: string | null;
};
export type CommentUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutCommentsNestedInput;
    parent?: Prisma.CommentUpdateOneWithoutRepliesNestedInput;
    replies?: Prisma.CommentUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    replies?: Prisma.CommentUncheckedUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateManyWithoutUserInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
};
export type CommentCreateManyMixInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    userId: string;
    parentId?: string | null;
};
export type CommentUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    user?: Prisma.UserUpdateOneRequiredWithoutCommentsNestedInput;
    parent?: Prisma.CommentUpdateOneWithoutRepliesNestedInput;
    replies?: Prisma.CommentUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
    replies?: Prisma.CommentUncheckedUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateManyWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    parentId?: Prisma.NullableStringFieldUpdateOperationsInput | string | null;
};
export type CommentCreateManyParentInput = {
    id?: string;
    body: string;
    timecodeSec?: number | null;
    createdAt?: Date | string;
    mixId: string;
    userId: string;
};
export type CommentUpdateWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mix?: Prisma.MixUpdateOneRequiredWithoutCommentsNestedInput;
    user?: Prisma.UserUpdateOneRequiredWithoutCommentsNestedInput;
    replies?: Prisma.CommentUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
    replies?: Prisma.CommentUncheckedUpdateManyWithoutParentNestedInput;
};
export type CommentUncheckedUpdateManyWithoutParentInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    body?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.NullableIntFieldUpdateOperationsInput | number | null;
    createdAt?: Prisma.DateTimeFieldUpdateOperationsInput | Date | string;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
    userId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type CommentCountOutputType = {
    replies: number;
};
export type CommentCountOutputTypeSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    replies?: boolean | CommentCountOutputTypeCountRepliesArgs;
};
export type CommentCountOutputTypeDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentCountOutputTypeSelect<ExtArgs> | null;
};
export type CommentCountOutputTypeCountRepliesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CommentWhereInput;
};
export type CommentSelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    body?: boolean;
    timecodeSec?: boolean;
    createdAt?: boolean;
    mixId?: boolean;
    userId?: boolean;
    parentId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
    replies?: boolean | Prisma.Comment$repliesArgs<ExtArgs>;
    _count?: boolean | Prisma.CommentCountOutputTypeDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["comment"]>;
export type CommentSelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    body?: boolean;
    timecodeSec?: boolean;
    createdAt?: boolean;
    mixId?: boolean;
    userId?: boolean;
    parentId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
}, ExtArgs["result"]["comment"]>;
export type CommentSelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    body?: boolean;
    timecodeSec?: boolean;
    createdAt?: boolean;
    mixId?: boolean;
    userId?: boolean;
    parentId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
}, ExtArgs["result"]["comment"]>;
export type CommentSelectScalar = {
    id?: boolean;
    body?: boolean;
    timecodeSec?: boolean;
    createdAt?: boolean;
    mixId?: boolean;
    userId?: boolean;
    parentId?: boolean;
};
export type CommentOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "body" | "timecodeSec" | "createdAt" | "mixId" | "userId" | "parentId", ExtArgs["result"]["comment"]>;
export type CommentInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
    replies?: boolean | Prisma.Comment$repliesArgs<ExtArgs>;
    _count?: boolean | Prisma.CommentCountOutputTypeDefaultArgs<ExtArgs>;
};
export type CommentIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
};
export type CommentIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
    user?: boolean | Prisma.UserDefaultArgs<ExtArgs>;
    parent?: boolean | Prisma.Comment$parentArgs<ExtArgs>;
};
export type $CommentPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "Comment";
    objects: {
        mix: Prisma.$MixPayload<ExtArgs>;
        user: Prisma.$UserPayload<ExtArgs>;
        parent: Prisma.$CommentPayload<ExtArgs> | null;
        replies: Prisma.$CommentPayload<ExtArgs>[];
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        body: string;
        timecodeSec: number | null;
        createdAt: Date;
        mixId: string;
        userId: string;
        parentId: string | null;
    }, ExtArgs["result"]["comment"]>;
    composites: {};
};
export type CommentGetPayload<S extends boolean | null | undefined | CommentDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$CommentPayload, S>;
export type CommentCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<CommentFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: CommentCountAggregateInputType | true;
};
export interface CommentDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['Comment'];
        meta: {
            name: 'Comment';
        };
    };
    findUnique<T extends CommentFindUniqueArgs>(args: Prisma.SelectSubset<T, CommentFindUniqueArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends CommentFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, CommentFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends CommentFindFirstArgs>(args?: Prisma.SelectSubset<T, CommentFindFirstArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends CommentFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, CommentFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends CommentFindManyArgs>(args?: Prisma.SelectSubset<T, CommentFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends CommentCreateArgs>(args: Prisma.SelectSubset<T, CommentCreateArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends CommentCreateManyArgs>(args?: Prisma.SelectSubset<T, CommentCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends CommentCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, CommentCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends CommentDeleteArgs>(args: Prisma.SelectSubset<T, CommentDeleteArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends CommentUpdateArgs>(args: Prisma.SelectSubset<T, CommentUpdateArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends CommentDeleteManyArgs>(args?: Prisma.SelectSubset<T, CommentDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends CommentUpdateManyArgs>(args: Prisma.SelectSubset<T, CommentUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends CommentUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, CommentUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends CommentUpsertArgs>(args: Prisma.SelectSubset<T, CommentUpsertArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends CommentCountArgs>(args?: Prisma.Subset<T, CommentCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], CommentCountAggregateOutputType> : number>;
    aggregate<T extends CommentAggregateArgs>(args: Prisma.Subset<T, CommentAggregateArgs>): Prisma.PrismaPromise<GetCommentAggregateType<T>>;
    groupBy<T extends CommentGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: CommentGroupByArgs['orderBy'];
    } : {
        orderBy?: CommentGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, CommentGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCommentGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: CommentFieldRefs;
}
export interface Prisma__CommentClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    mix<T extends Prisma.MixDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.MixDefaultArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    user<T extends Prisma.UserDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.UserDefaultArgs<ExtArgs>>): Prisma.Prisma__UserClient<runtime.Types.Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    parent<T extends Prisma.Comment$parentArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Comment$parentArgs<ExtArgs>>): Prisma.Prisma__CommentClient<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    replies<T extends Prisma.Comment$repliesArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.Comment$repliesArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$CommentPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface CommentFieldRefs {
    readonly id: Prisma.FieldRef<"Comment", 'String'>;
    readonly body: Prisma.FieldRef<"Comment", 'String'>;
    readonly timecodeSec: Prisma.FieldRef<"Comment", 'Int'>;
    readonly createdAt: Prisma.FieldRef<"Comment", 'DateTime'>;
    readonly mixId: Prisma.FieldRef<"Comment", 'String'>;
    readonly userId: Prisma.FieldRef<"Comment", 'String'>;
    readonly parentId: Prisma.FieldRef<"Comment", 'String'>;
}
export type CommentFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where: Prisma.CommentWhereUniqueInput;
};
export type CommentFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where: Prisma.CommentWhereUniqueInput;
};
export type CommentFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type CommentFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type CommentFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type CommentCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CommentCreateInput, Prisma.CommentUncheckedCreateInput>;
};
export type CommentCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.CommentCreateManyInput | Prisma.CommentCreateManyInput[];
    skipDuplicates?: boolean;
};
export type CommentCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    data: Prisma.CommentCreateManyInput | Prisma.CommentCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.CommentIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type CommentUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CommentUpdateInput, Prisma.CommentUncheckedUpdateInput>;
    where: Prisma.CommentWhereUniqueInput;
};
export type CommentUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.CommentUpdateManyMutationInput, Prisma.CommentUncheckedUpdateManyInput>;
    where?: Prisma.CommentWhereInput;
    limit?: number;
};
export type CommentUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.CommentUpdateManyMutationInput, Prisma.CommentUncheckedUpdateManyInput>;
    where?: Prisma.CommentWhereInput;
    limit?: number;
    include?: Prisma.CommentIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type CommentUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where: Prisma.CommentWhereUniqueInput;
    create: Prisma.XOR<Prisma.CommentCreateInput, Prisma.CommentUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.CommentUpdateInput, Prisma.CommentUncheckedUpdateInput>;
};
export type CommentDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where: Prisma.CommentWhereUniqueInput;
};
export type CommentDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.CommentWhereInput;
    limit?: number;
};
export type Comment$parentArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
    where?: Prisma.CommentWhereInput;
};
export type Comment$repliesArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type CommentDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.CommentSelect<ExtArgs> | null;
    omit?: Prisma.CommentOmit<ExtArgs> | null;
    include?: Prisma.CommentInclude<ExtArgs> | null;
};
