import type * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "../internal/prismaNamespace.js";
export type TracklistEntryModel = runtime.Types.Result.DefaultSelection<Prisma.$TracklistEntryPayload>;
export type AggregateTracklistEntry = {
    _count: TracklistEntryCountAggregateOutputType | null;
    _avg: TracklistEntryAvgAggregateOutputType | null;
    _sum: TracklistEntrySumAggregateOutputType | null;
    _min: TracklistEntryMinAggregateOutputType | null;
    _max: TracklistEntryMaxAggregateOutputType | null;
};
export type TracklistEntryAvgAggregateOutputType = {
    timecodeSec: number | null;
};
export type TracklistEntrySumAggregateOutputType = {
    timecodeSec: number | null;
};
export type TracklistEntryMinAggregateOutputType = {
    id: string | null;
    artist: string | null;
    title: string | null;
    timecodeSec: number | null;
    mixId: string | null;
};
export type TracklistEntryMaxAggregateOutputType = {
    id: string | null;
    artist: string | null;
    title: string | null;
    timecodeSec: number | null;
    mixId: string | null;
};
export type TracklistEntryCountAggregateOutputType = {
    id: number;
    artist: number;
    title: number;
    timecodeSec: number;
    mixId: number;
    _all: number;
};
export type TracklistEntryAvgAggregateInputType = {
    timecodeSec?: true;
};
export type TracklistEntrySumAggregateInputType = {
    timecodeSec?: true;
};
export type TracklistEntryMinAggregateInputType = {
    id?: true;
    artist?: true;
    title?: true;
    timecodeSec?: true;
    mixId?: true;
};
export type TracklistEntryMaxAggregateInputType = {
    id?: true;
    artist?: true;
    title?: true;
    timecodeSec?: true;
    mixId?: true;
};
export type TracklistEntryCountAggregateInputType = {
    id?: true;
    artist?: true;
    title?: true;
    timecodeSec?: true;
    mixId?: true;
    _all?: true;
};
export type TracklistEntryAggregateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.TracklistEntryWhereInput;
    orderBy?: Prisma.TracklistEntryOrderByWithRelationInput | Prisma.TracklistEntryOrderByWithRelationInput[];
    cursor?: Prisma.TracklistEntryWhereUniqueInput;
    take?: number;
    skip?: number;
    _count?: true | TracklistEntryCountAggregateInputType;
    _avg?: TracklistEntryAvgAggregateInputType;
    _sum?: TracklistEntrySumAggregateInputType;
    _min?: TracklistEntryMinAggregateInputType;
    _max?: TracklistEntryMaxAggregateInputType;
};
export type GetTracklistEntryAggregateType<T extends TracklistEntryAggregateArgs> = {
    [P in keyof T & keyof AggregateTracklistEntry]: P extends '_count' | 'count' ? T[P] extends true ? number : Prisma.GetScalarType<T[P], AggregateTracklistEntry[P]> : Prisma.GetScalarType<T[P], AggregateTracklistEntry[P]>;
};
export type TracklistEntryGroupByArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.TracklistEntryWhereInput;
    orderBy?: Prisma.TracklistEntryOrderByWithAggregationInput | Prisma.TracklistEntryOrderByWithAggregationInput[];
    by: Prisma.TracklistEntryScalarFieldEnum[] | Prisma.TracklistEntryScalarFieldEnum;
    having?: Prisma.TracklistEntryScalarWhereWithAggregatesInput;
    take?: number;
    skip?: number;
    _count?: TracklistEntryCountAggregateInputType | true;
    _avg?: TracklistEntryAvgAggregateInputType;
    _sum?: TracklistEntrySumAggregateInputType;
    _min?: TracklistEntryMinAggregateInputType;
    _max?: TracklistEntryMaxAggregateInputType;
};
export type TracklistEntryGroupByOutputType = {
    id: string;
    artist: string;
    title: string;
    timecodeSec: number;
    mixId: string;
    _count: TracklistEntryCountAggregateOutputType | null;
    _avg: TracklistEntryAvgAggregateOutputType | null;
    _sum: TracklistEntrySumAggregateOutputType | null;
    _min: TracklistEntryMinAggregateOutputType | null;
    _max: TracklistEntryMaxAggregateOutputType | null;
};
export type GetTracklistEntryGroupByPayload<T extends TracklistEntryGroupByArgs> = Prisma.PrismaPromise<Array<Prisma.PickEnumerable<TracklistEntryGroupByOutputType, T['by']> & {
    [P in ((keyof T) & (keyof TracklistEntryGroupByOutputType))]: P extends '_count' ? T[P] extends boolean ? number : Prisma.GetScalarType<T[P], TracklistEntryGroupByOutputType[P]> : Prisma.GetScalarType<T[P], TracklistEntryGroupByOutputType[P]>;
}>>;
export type TracklistEntryWhereInput = {
    AND?: Prisma.TracklistEntryWhereInput | Prisma.TracklistEntryWhereInput[];
    OR?: Prisma.TracklistEntryWhereInput[];
    NOT?: Prisma.TracklistEntryWhereInput | Prisma.TracklistEntryWhereInput[];
    id?: Prisma.StringFilter<"TracklistEntry"> | string;
    artist?: Prisma.StringFilter<"TracklistEntry"> | string;
    title?: Prisma.StringFilter<"TracklistEntry"> | string;
    timecodeSec?: Prisma.IntFilter<"TracklistEntry"> | number;
    mixId?: Prisma.StringFilter<"TracklistEntry"> | string;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
};
export type TracklistEntryOrderByWithRelationInput = {
    id?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    mix?: Prisma.MixOrderByWithRelationInput;
};
export type TracklistEntryWhereUniqueInput = Prisma.AtLeast<{
    id?: string;
    AND?: Prisma.TracklistEntryWhereInput | Prisma.TracklistEntryWhereInput[];
    OR?: Prisma.TracklistEntryWhereInput[];
    NOT?: Prisma.TracklistEntryWhereInput | Prisma.TracklistEntryWhereInput[];
    artist?: Prisma.StringFilter<"TracklistEntry"> | string;
    title?: Prisma.StringFilter<"TracklistEntry"> | string;
    timecodeSec?: Prisma.IntFilter<"TracklistEntry"> | number;
    mixId?: Prisma.StringFilter<"TracklistEntry"> | string;
    mix?: Prisma.XOR<Prisma.MixScalarRelationFilter, Prisma.MixWhereInput>;
}, "id">;
export type TracklistEntryOrderByWithAggregationInput = {
    id?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
    _count?: Prisma.TracklistEntryCountOrderByAggregateInput;
    _avg?: Prisma.TracklistEntryAvgOrderByAggregateInput;
    _max?: Prisma.TracklistEntryMaxOrderByAggregateInput;
    _min?: Prisma.TracklistEntryMinOrderByAggregateInput;
    _sum?: Prisma.TracklistEntrySumOrderByAggregateInput;
};
export type TracklistEntryScalarWhereWithAggregatesInput = {
    AND?: Prisma.TracklistEntryScalarWhereWithAggregatesInput | Prisma.TracklistEntryScalarWhereWithAggregatesInput[];
    OR?: Prisma.TracklistEntryScalarWhereWithAggregatesInput[];
    NOT?: Prisma.TracklistEntryScalarWhereWithAggregatesInput | Prisma.TracklistEntryScalarWhereWithAggregatesInput[];
    id?: Prisma.StringWithAggregatesFilter<"TracklistEntry"> | string;
    artist?: Prisma.StringWithAggregatesFilter<"TracklistEntry"> | string;
    title?: Prisma.StringWithAggregatesFilter<"TracklistEntry"> | string;
    timecodeSec?: Prisma.IntWithAggregatesFilter<"TracklistEntry"> | number;
    mixId?: Prisma.StringWithAggregatesFilter<"TracklistEntry"> | string;
};
export type TracklistEntryCreateInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
    mix: Prisma.MixCreateNestedOneWithoutTracklistInput;
};
export type TracklistEntryUncheckedCreateInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
    mixId: string;
};
export type TracklistEntryUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
    mix?: Prisma.MixUpdateOneRequiredWithoutTracklistNestedInput;
};
export type TracklistEntryUncheckedUpdateInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type TracklistEntryCreateManyInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
    mixId: string;
};
export type TracklistEntryUpdateManyMutationInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TracklistEntryUncheckedUpdateManyInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
    mixId?: Prisma.StringFieldUpdateOperationsInput | string;
};
export type TracklistEntryListRelationFilter = {
    every?: Prisma.TracklistEntryWhereInput;
    some?: Prisma.TracklistEntryWhereInput;
    none?: Prisma.TracklistEntryWhereInput;
};
export type TracklistEntryOrderByRelationAggregateInput = {
    _count?: Prisma.SortOrder;
};
export type TracklistEntryCountOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type TracklistEntryAvgOrderByAggregateInput = {
    timecodeSec?: Prisma.SortOrder;
};
export type TracklistEntryMaxOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type TracklistEntryMinOrderByAggregateInput = {
    id?: Prisma.SortOrder;
    artist?: Prisma.SortOrder;
    title?: Prisma.SortOrder;
    timecodeSec?: Prisma.SortOrder;
    mixId?: Prisma.SortOrder;
};
export type TracklistEntrySumOrderByAggregateInput = {
    timecodeSec?: Prisma.SortOrder;
};
export type TracklistEntryCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput> | Prisma.TracklistEntryCreateWithoutMixInput[] | Prisma.TracklistEntryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.TracklistEntryCreateOrConnectWithoutMixInput | Prisma.TracklistEntryCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.TracklistEntryCreateManyMixInputEnvelope;
    connect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
};
export type TracklistEntryUncheckedCreateNestedManyWithoutMixInput = {
    create?: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput> | Prisma.TracklistEntryCreateWithoutMixInput[] | Prisma.TracklistEntryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.TracklistEntryCreateOrConnectWithoutMixInput | Prisma.TracklistEntryCreateOrConnectWithoutMixInput[];
    createMany?: Prisma.TracklistEntryCreateManyMixInputEnvelope;
    connect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
};
export type TracklistEntryUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput> | Prisma.TracklistEntryCreateWithoutMixInput[] | Prisma.TracklistEntryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.TracklistEntryCreateOrConnectWithoutMixInput | Prisma.TracklistEntryCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.TracklistEntryUpsertWithWhereUniqueWithoutMixInput | Prisma.TracklistEntryUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.TracklistEntryCreateManyMixInputEnvelope;
    set?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    disconnect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    delete?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    connect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    update?: Prisma.TracklistEntryUpdateWithWhereUniqueWithoutMixInput | Prisma.TracklistEntryUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.TracklistEntryUpdateManyWithWhereWithoutMixInput | Prisma.TracklistEntryUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.TracklistEntryScalarWhereInput | Prisma.TracklistEntryScalarWhereInput[];
};
export type TracklistEntryUncheckedUpdateManyWithoutMixNestedInput = {
    create?: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput> | Prisma.TracklistEntryCreateWithoutMixInput[] | Prisma.TracklistEntryUncheckedCreateWithoutMixInput[];
    connectOrCreate?: Prisma.TracklistEntryCreateOrConnectWithoutMixInput | Prisma.TracklistEntryCreateOrConnectWithoutMixInput[];
    upsert?: Prisma.TracklistEntryUpsertWithWhereUniqueWithoutMixInput | Prisma.TracklistEntryUpsertWithWhereUniqueWithoutMixInput[];
    createMany?: Prisma.TracklistEntryCreateManyMixInputEnvelope;
    set?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    disconnect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    delete?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    connect?: Prisma.TracklistEntryWhereUniqueInput | Prisma.TracklistEntryWhereUniqueInput[];
    update?: Prisma.TracklistEntryUpdateWithWhereUniqueWithoutMixInput | Prisma.TracklistEntryUpdateWithWhereUniqueWithoutMixInput[];
    updateMany?: Prisma.TracklistEntryUpdateManyWithWhereWithoutMixInput | Prisma.TracklistEntryUpdateManyWithWhereWithoutMixInput[];
    deleteMany?: Prisma.TracklistEntryScalarWhereInput | Prisma.TracklistEntryScalarWhereInput[];
};
export type TracklistEntryCreateWithoutMixInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
};
export type TracklistEntryUncheckedCreateWithoutMixInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
};
export type TracklistEntryCreateOrConnectWithoutMixInput = {
    where: Prisma.TracklistEntryWhereUniqueInput;
    create: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput>;
};
export type TracklistEntryCreateManyMixInputEnvelope = {
    data: Prisma.TracklistEntryCreateManyMixInput | Prisma.TracklistEntryCreateManyMixInput[];
    skipDuplicates?: boolean;
};
export type TracklistEntryUpsertWithWhereUniqueWithoutMixInput = {
    where: Prisma.TracklistEntryWhereUniqueInput;
    update: Prisma.XOR<Prisma.TracklistEntryUpdateWithoutMixInput, Prisma.TracklistEntryUncheckedUpdateWithoutMixInput>;
    create: Prisma.XOR<Prisma.TracklistEntryCreateWithoutMixInput, Prisma.TracklistEntryUncheckedCreateWithoutMixInput>;
};
export type TracklistEntryUpdateWithWhereUniqueWithoutMixInput = {
    where: Prisma.TracklistEntryWhereUniqueInput;
    data: Prisma.XOR<Prisma.TracklistEntryUpdateWithoutMixInput, Prisma.TracklistEntryUncheckedUpdateWithoutMixInput>;
};
export type TracklistEntryUpdateManyWithWhereWithoutMixInput = {
    where: Prisma.TracklistEntryScalarWhereInput;
    data: Prisma.XOR<Prisma.TracklistEntryUpdateManyMutationInput, Prisma.TracklistEntryUncheckedUpdateManyWithoutMixInput>;
};
export type TracklistEntryScalarWhereInput = {
    AND?: Prisma.TracklistEntryScalarWhereInput | Prisma.TracklistEntryScalarWhereInput[];
    OR?: Prisma.TracklistEntryScalarWhereInput[];
    NOT?: Prisma.TracklistEntryScalarWhereInput | Prisma.TracklistEntryScalarWhereInput[];
    id?: Prisma.StringFilter<"TracklistEntry"> | string;
    artist?: Prisma.StringFilter<"TracklistEntry"> | string;
    title?: Prisma.StringFilter<"TracklistEntry"> | string;
    timecodeSec?: Prisma.IntFilter<"TracklistEntry"> | number;
    mixId?: Prisma.StringFilter<"TracklistEntry"> | string;
};
export type TracklistEntryCreateManyMixInput = {
    id?: string;
    artist: string;
    title: string;
    timecodeSec: number;
};
export type TracklistEntryUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TracklistEntryUncheckedUpdateWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TracklistEntryUncheckedUpdateManyWithoutMixInput = {
    id?: Prisma.StringFieldUpdateOperationsInput | string;
    artist?: Prisma.StringFieldUpdateOperationsInput | string;
    title?: Prisma.StringFieldUpdateOperationsInput | string;
    timecodeSec?: Prisma.IntFieldUpdateOperationsInput | number;
};
export type TracklistEntrySelect<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    artist?: boolean;
    title?: boolean;
    timecodeSec?: boolean;
    mixId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tracklistEntry"]>;
export type TracklistEntrySelectCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    artist?: boolean;
    title?: boolean;
    timecodeSec?: boolean;
    mixId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tracklistEntry"]>;
export type TracklistEntrySelectUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetSelect<{
    id?: boolean;
    artist?: boolean;
    title?: boolean;
    timecodeSec?: boolean;
    mixId?: boolean;
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
}, ExtArgs["result"]["tracklistEntry"]>;
export type TracklistEntrySelectScalar = {
    id?: boolean;
    artist?: boolean;
    title?: boolean;
    timecodeSec?: boolean;
    mixId?: boolean;
};
export type TracklistEntryOmit<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = runtime.Types.Extensions.GetOmit<"id" | "artist" | "title" | "timecodeSec" | "mixId", ExtArgs["result"]["tracklistEntry"]>;
export type TracklistEntryInclude<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type TracklistEntryIncludeCreateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type TracklistEntryIncludeUpdateManyAndReturn<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    mix?: boolean | Prisma.MixDefaultArgs<ExtArgs>;
};
export type $TracklistEntryPayload<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    name: "TracklistEntry";
    objects: {
        mix: Prisma.$MixPayload<ExtArgs>;
    };
    scalars: runtime.Types.Extensions.GetPayloadResult<{
        id: string;
        artist: string;
        title: string;
        timecodeSec: number;
        mixId: string;
    }, ExtArgs["result"]["tracklistEntry"]>;
    composites: {};
};
export type TracklistEntryGetPayload<S extends boolean | null | undefined | TracklistEntryDefaultArgs> = runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload, S>;
export type TracklistEntryCountArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = Omit<TracklistEntryFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
    select?: TracklistEntryCountAggregateInputType | true;
};
export interface TracklistEntryDelegate<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['model']['TracklistEntry'];
        meta: {
            name: 'TracklistEntry';
        };
    };
    findUnique<T extends TracklistEntryFindUniqueArgs>(args: Prisma.SelectSubset<T, TracklistEntryFindUniqueArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findUniqueOrThrow<T extends TracklistEntryFindUniqueOrThrowArgs>(args: Prisma.SelectSubset<T, TracklistEntryFindUniqueOrThrowArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findFirst<T extends TracklistEntryFindFirstArgs>(args?: Prisma.SelectSubset<T, TracklistEntryFindFirstArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>;
    findFirstOrThrow<T extends TracklistEntryFindFirstOrThrowArgs>(args?: Prisma.SelectSubset<T, TracklistEntryFindFirstOrThrowArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    findMany<T extends TracklistEntryFindManyArgs>(args?: Prisma.SelectSubset<T, TracklistEntryFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>;
    create<T extends TracklistEntryCreateArgs>(args: Prisma.SelectSubset<T, TracklistEntryCreateArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    createMany<T extends TracklistEntryCreateManyArgs>(args?: Prisma.SelectSubset<T, TracklistEntryCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    createManyAndReturn<T extends TracklistEntryCreateManyAndReturnArgs>(args?: Prisma.SelectSubset<T, TracklistEntryCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>;
    delete<T extends TracklistEntryDeleteArgs>(args: Prisma.SelectSubset<T, TracklistEntryDeleteArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    update<T extends TracklistEntryUpdateArgs>(args: Prisma.SelectSubset<T, TracklistEntryUpdateArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    deleteMany<T extends TracklistEntryDeleteManyArgs>(args?: Prisma.SelectSubset<T, TracklistEntryDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateMany<T extends TracklistEntryUpdateManyArgs>(args: Prisma.SelectSubset<T, TracklistEntryUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<Prisma.BatchPayload>;
    updateManyAndReturn<T extends TracklistEntryUpdateManyAndReturnArgs>(args: Prisma.SelectSubset<T, TracklistEntryUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>;
    upsert<T extends TracklistEntryUpsertArgs>(args: Prisma.SelectSubset<T, TracklistEntryUpsertArgs<ExtArgs>>): Prisma.Prisma__TracklistEntryClient<runtime.Types.Result.GetResult<Prisma.$TracklistEntryPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>;
    count<T extends TracklistEntryCountArgs>(args?: Prisma.Subset<T, TracklistEntryCountArgs>): Prisma.PrismaPromise<T extends runtime.Types.Utils.Record<'select', any> ? T['select'] extends true ? number : Prisma.GetScalarType<T['select'], TracklistEntryCountAggregateOutputType> : number>;
    aggregate<T extends TracklistEntryAggregateArgs>(args: Prisma.Subset<T, TracklistEntryAggregateArgs>): Prisma.PrismaPromise<GetTracklistEntryAggregateType<T>>;
    groupBy<T extends TracklistEntryGroupByArgs, HasSelectOrTake extends Prisma.Or<Prisma.Extends<'skip', Prisma.Keys<T>>, Prisma.Extends<'take', Prisma.Keys<T>>>, OrderByArg extends Prisma.True extends HasSelectOrTake ? {
        orderBy: TracklistEntryGroupByArgs['orderBy'];
    } : {
        orderBy?: TracklistEntryGroupByArgs['orderBy'];
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
    }[OrderFields]>(args: Prisma.SubsetIntersection<T, TracklistEntryGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetTracklistEntryGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>;
    readonly fields: TracklistEntryFieldRefs;
}
export interface Prisma__TracklistEntryClient<T, Null = never, ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise";
    mix<T extends Prisma.MixDefaultArgs<ExtArgs> = {}>(args?: Prisma.Subset<T, Prisma.MixDefaultArgs<ExtArgs>>): Prisma.Prisma__MixClient<runtime.Types.Result.GetResult<Prisma.$MixPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>;
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): runtime.Types.Utils.JsPromise<TResult1 | TResult2>;
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): runtime.Types.Utils.JsPromise<T | TResult>;
    finally(onfinally?: (() => void) | undefined | null): runtime.Types.Utils.JsPromise<T>;
}
export interface TracklistEntryFieldRefs {
    readonly id: Prisma.FieldRef<"TracklistEntry", 'String'>;
    readonly artist: Prisma.FieldRef<"TracklistEntry", 'String'>;
    readonly title: Prisma.FieldRef<"TracklistEntry", 'String'>;
    readonly timecodeSec: Prisma.FieldRef<"TracklistEntry", 'Int'>;
    readonly mixId: Prisma.FieldRef<"TracklistEntry", 'String'>;
}
export type TracklistEntryFindUniqueArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    where: Prisma.TracklistEntryWhereUniqueInput;
};
export type TracklistEntryFindUniqueOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    where: Prisma.TracklistEntryWhereUniqueInput;
};
export type TracklistEntryFindFirstArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type TracklistEntryFindFirstOrThrowArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type TracklistEntryFindManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
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
export type TracklistEntryCreateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.TracklistEntryCreateInput, Prisma.TracklistEntryUncheckedCreateInput>;
};
export type TracklistEntryCreateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.TracklistEntryCreateManyInput | Prisma.TracklistEntryCreateManyInput[];
    skipDuplicates?: boolean;
};
export type TracklistEntryCreateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelectCreateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    data: Prisma.TracklistEntryCreateManyInput | Prisma.TracklistEntryCreateManyInput[];
    skipDuplicates?: boolean;
    include?: Prisma.TracklistEntryIncludeCreateManyAndReturn<ExtArgs> | null;
};
export type TracklistEntryUpdateArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    data: Prisma.XOR<Prisma.TracklistEntryUpdateInput, Prisma.TracklistEntryUncheckedUpdateInput>;
    where: Prisma.TracklistEntryWhereUniqueInput;
};
export type TracklistEntryUpdateManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    data: Prisma.XOR<Prisma.TracklistEntryUpdateManyMutationInput, Prisma.TracklistEntryUncheckedUpdateManyInput>;
    where?: Prisma.TracklistEntryWhereInput;
    limit?: number;
};
export type TracklistEntryUpdateManyAndReturnArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelectUpdateManyAndReturn<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    data: Prisma.XOR<Prisma.TracklistEntryUpdateManyMutationInput, Prisma.TracklistEntryUncheckedUpdateManyInput>;
    where?: Prisma.TracklistEntryWhereInput;
    limit?: number;
    include?: Prisma.TracklistEntryIncludeUpdateManyAndReturn<ExtArgs> | null;
};
export type TracklistEntryUpsertArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    where: Prisma.TracklistEntryWhereUniqueInput;
    create: Prisma.XOR<Prisma.TracklistEntryCreateInput, Prisma.TracklistEntryUncheckedCreateInput>;
    update: Prisma.XOR<Prisma.TracklistEntryUpdateInput, Prisma.TracklistEntryUncheckedUpdateInput>;
};
export type TracklistEntryDeleteArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
    where: Prisma.TracklistEntryWhereUniqueInput;
};
export type TracklistEntryDeleteManyArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    where?: Prisma.TracklistEntryWhereInput;
    limit?: number;
};
export type TracklistEntryDefaultArgs<ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = {
    select?: Prisma.TracklistEntrySelect<ExtArgs> | null;
    omit?: Prisma.TracklistEntryOmit<ExtArgs> | null;
    include?: Prisma.TracklistEntryInclude<ExtArgs> | null;
};
