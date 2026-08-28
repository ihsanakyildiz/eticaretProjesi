import { readFile, stat } from "fs/promises";
import { NextResponse } from "next/server";
import { mimeForUploadPath, resolvePublicUploadFile } from "@/lib/uploads";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const relative = segments.filter(Boolean).join("/");
  const absolutePath = resolvePublicUploadFile(`/uploads/${relative}`);

  if (!absolutePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(absolutePath);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }

    const body = await readFile(absolutePath);
    return new NextResponse(body, {
      headers: {
        "Content-Type": mimeForUploadPath(absolutePath),
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
