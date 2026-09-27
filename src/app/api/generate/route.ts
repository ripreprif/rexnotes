import { NextRequest, NextResponse } from "next/server";
import { generateDiagramDSL } from "@/lib/ai/client";
import { DiagramValidationError } from "@/lib/diagram/validator";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body request harus JSON valid." },
      { status: 400 }
    );
  }

  const prompt = (body as { prompt?: unknown })?.prompt;
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return NextResponse.json(
      { error: "Field 'prompt' wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const dsl = await generateDiagramDSL(prompt);
    return NextResponse.json({ dsl });
  } catch (error) {
    if (error instanceof DiagramValidationError) {
      console.error("Validasi DSL gagal:", error.issues);
      return NextResponse.json(
        {
          error:
            "AI menghasilkan diagram dengan format tidak sesuai. Coba ulangi dengan instruksi yang lebih jelas.",
        },
        { status: 502 }
      );
    }

    console.error("Gagal generate diagram:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menghubungi AI. Coba lagi sebentar." },
      { status: 500 }
    );
  }
}