import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const requestHeaders = new Headers(request.headers);

    requestHeaders.set("x-invoke-url", new URL(request.url).pathname);

    return NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });
}
