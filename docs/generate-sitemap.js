const { glob } = require('glob');
const { writeFileSync, lstatSync } = require('fs');
const path = require('path');

async function main() {
    const excluded = [];
    const pages = await glob("app/**/page.{ts,md}x");
    const routes = [];
    
    for (const page of pages) {
        let route = page.replace(/^app\//gi, '').replace(/\/page\.(ts|md)x/gi, '');
        route = route === "" ? "/" : route;
        
        if (excluded.includes(route)) {
            continue;
        }
        
        const lastmod = lstatSync(page).mtime;
        
        routes.push({
            path: route,
            file: page,
            lastmod
        });
    }
    
    const urls = routes.map(route => `
        <url>
            <loc>${route.path}</loc>
            <lastmod>${route.lastmod.toISOString()}</lastmod>
            <priority>${route.path === "/" ? "1.0" : "0.8"}</priority>
        </url>
    `);
    
    const urlset = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${urls.join("\n\t")}
        </urlset>
    `;
    
    writeFileSync(path.join(__dirname, "sitemap.xml"), urlset);
}

main();
