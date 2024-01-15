import { getIndex } from "@/utils/pages";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const query = new URL(request.url).searchParams.get("q")?.toLowerCase();

    if (!query) {
        return NextResponse.json(
            {
                error: "Invalid Request Payload",
            },
            {
                status: 400,
            },
        );
    }

    const index = await getIndex();
    console.log(query, index);

    const results = [];

    if (index) {
        for (const i in index) {
            const titleIncludes = index[i].title?.includes(query);
            const descriptionIncludes = index[i].description?.includes(query);
            const dataIncludes = index[i].data.includes(query);

            if (titleIncludes || descriptionIncludes || dataIncludes) {
                results.push({
                    ...index?.[i],
                    match: titleIncludes
                        ? "title"
                        : descriptionIncludes
                        ? "description"
                        : "data",
                });
            }
        }
    }

    return NextResponse.json({
        results,
    });
}
