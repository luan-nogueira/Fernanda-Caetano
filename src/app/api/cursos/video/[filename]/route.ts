import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { getAdminSession, getStudentSession } from "@/lib/auth";

const VIDEOS_DIR = path.join(process.cwd(), "cursos-videos");

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ filename: string }> }
) {
  try {
    const studentSession = await getStudentSession();
    const adminSession = await getAdminSession();
    const { searchParams } = new URL(req.url);
    const isPreview = searchParams.get("preview") === "1";

    if (!studentSession && !adminSession && !isPreview) {
      return NextResponse.json(
        { error: "Acesso restrito a alunos matriculados." },
        { status: 401 }
      );
    }

    const { filename } = await context.params;
    const safeName = path.basename(decodeURIComponent(filename));
    const filePath = path.join(VIDEOS_DIR, safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        {
          error: `Arquivo de vídeo "${safeName}" ainda não foi colocado na pasta cursos-videos do servidor.`,
        },
        { status: 404 }
      );
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.get("range");
    const ext = path.extname(safeName).toLowerCase();
    const contentType =
      ext === ".webm"
        ? "video/webm"
        : ext === ".mov"
        ? "video/quicktime"
        : "video/mp4";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : Math.min(start + 2 * 1024 * 1024, fileSize - 1);
      const chunksize = end - start + 1;

      const buffer = Buffer.alloc(chunksize);
      const fd = fs.openSync(filePath, "r");
      fs.readSync(fd, buffer, 0, chunksize, start);
      fs.closeSync(fd);

      return new NextResponse(buffer, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunksize),
          "Content-Type": contentType,
        },
      });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Length": String(fileSize),
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
      },
    });
  } catch (err) {
    console.error("Erro ao transmitir vídeo local:", err);
    return NextResponse.json(
      { error: "Erro ao carregar vídeo do curso." },
      { status: 500 }
    );
  }
}
