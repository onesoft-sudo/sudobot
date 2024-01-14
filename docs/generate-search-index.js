const { readFile, writeFile, cp } = require("fs/promises");
const { glob } = require("glob");
const path = require("path");

(async () => {
    const pages = await glob("app/**/page.{tsx,mdx}");
    const index = [];

    for (const page of pages) {
        const isMDX = page.endsWith(".mdx");
        index.push(
            isMDX
                ? await generateIndexForMDXPage(page)
                : await generateIndexForTSXPage(page),
        );
        console.log("DONE ", page);
    }

    await writeFile(path.join(__dirname, "index.json"), JSON.stringify(index));

    try {
        await cp(
            path.join(__dirname, "index.json"),
            path.join(__dirname, ".next/server/index.json"),
        );
    } catch (error) {
        console.error(error);
    }

    console.table(
        index.map(item => ({
            ...item,
            data: `${item.data?.substring(0, 50)}${
                item.data?.length && item.data?.length > 15 ? "..." : ""
            }`,
        })),
    );
})();

async function generateIndexForMDXPage(page) {
    const contents = await readFile(page, {
        encoding: "utf-8",
    });
    let [frontmatter, data] = contents
        .substring(contents.startsWith("---") ? 3 : 0)
        .split("\n---\n");

    if (!contents.startsWith("---")) {
        data = frontmatter;
        frontmatter = null;
    }

    const entries = frontmatter
        ?.split("\n")
        .filter(Boolean)
        .map(entry => entry.split(":").map(a => a.trim()));
    const frontmatterData = entries ? Object.fromEntries(entries) : null;

    return {
        title: frontmatterData?.title,
        description: frontmatterData?.description,
        data: data
            .replace(/^(([\s\r\n]*)import(.+);)+/gi, "")
            .replace(/^(([\s\r\n]*)export(.+);)+/gi, "")
            .replace(/(([\s\r\n]*)export default (.+);(\s*))+$/gi, "")
            .replace(/<\/?[^>]+(>|$)/g, ""),
        url:
            "/" + page.replace(/^app\//gi, "").replace(/page\.(ts|md)x$/gi, ""),
    };
}

async function generateIndexForTSXPage(page) {
    throw new Error("Not implemented");
}
