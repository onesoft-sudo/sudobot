import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

type Index = {
    title?: string;
    description?: string;
    data: string;
};

let index: Index[] | null = null,
    lowercasedIndex: Index[] | null = null;

async function loadIndex() {
    if (index !== null) {
        return;
    }

    const indexPath = path.resolve(__dirname, "../../index.json");

    if (!existsSync(indexPath)) {
        console.warn("No index was built at ", indexPath);
        return;
    }

    index = JSON.parse(await readFile(indexPath, { encoding: "utf-8" }));
    lowercasedIndex =
        index?.map(entry => ({
            data: entry.data.toLowerCase(),
            title: entry.title?.toLowerCase(),
            description: entry.description?.toLowerCase(),
        })) ?? null;
}

export async function GET(request: NextRequest) {
    await loadIndex();
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
