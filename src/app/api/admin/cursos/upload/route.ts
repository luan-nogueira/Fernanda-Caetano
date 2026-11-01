import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requireAdminSession } from "@/lib/auth";

const VIDEOS_DIR = path.join(process.cwd(), "cursos-videos");

export async function POST(req: NextRequest) {
  try {
    await requireAdminSession();

    if (!fs.existsSync(VIDEOS_DIR)) {
      fs.mkdirSync(VIDEOS_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "Selecione um arquivo de vídeo (.mp4, .webm ou .mov)." },
        { status: 400 }
      );
    }

    const safeFileName = path
      .basename(file.name)
      .replace(/[^a-zA-Z0-9._-]/g, "-");

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const destPath = path.join(VIDEOS_DIR, safeFileName);

    fs.writeFileSync(destPath, buffer);

    return NextResponse.json({
      success: true,
      fileName: safeFileName,
      sizeMB: (buffer.length / (1024 * 1024)).toFixed(2),
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Erro ao salvar vídeo na pasta cursos-videos." },
      { status: 500 }
    );
  }
}

