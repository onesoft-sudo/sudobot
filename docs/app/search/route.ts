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

    const index = getIndex();
    const lowercasedIndex = getIndex(true);

    console.log(query, lowercasedIndex);

    const results = [];

    if (lowercasedIndex) {
        for (const i in lowercasedIndex) {
            const titleIncludes = lowercasedIndex[i].title?.includes(query);
            const descriptionIncludes =
                lowercasedIndex[i].description?.includes(query);
            const dataIncludes = lowercasedIndex[i].data.includes(query);

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
