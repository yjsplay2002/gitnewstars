import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { auth, ADMIN_EMAIL } from "@/auth";
import { readJson, writeJson, getDataRepo } from "@/lib/github";
import type { Overrides } from "@/lib/types";

const OVERRIDES_PATH = "data/overrides.json";

/**
 * Admin-only: set or clear the Korean description override for one repo.
 * Body: { fullName: string, descKo: string }  (empty descKo removes it)
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email || email !== ADMIN_EMAIL.toLowerCase()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getDataRepo() || !process.env.GH_TOKEN) {
    return NextResponse.json(
      { error: "Server is not configured for editing (GH_DATA_REPO/GH_TOKEN)." },
      { status: 500 }
    );
  }

  let body: { fullName?: string; descKo?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = body.fullName?.trim();
  const descKo = (body.descKo ?? "").trim();
  if (!fullName || !/^[\w.-]+\/[\w.-]+$/.test(fullName)) {
    return NextResponse.json({ error: "Invalid fullName" }, { status: 400 });
  }
  if (descKo.length > 500) {
    return NextResponse.json({ error: "Description too long" }, { status: 400 });
  }

  const overrides = (await readJson<Overrides>(OVERRIDES_PATH, 0)) ?? {};

  if (descKo) {
    overrides[fullName] = {
      descKo,
      updatedAt: new Date().toISOString(),
      updatedBy: email,
    };
  } else {
    delete overrides[fullName];
  }

  try {
    await writeJson(
      OVERRIDES_PATH,
      overrides,
      `chore: ${descKo ? "update" : "remove"} ko description for ${fullName}`
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Write failed" },
      { status: 502 }
    );
  }

  // Refresh cached pages so the edit shows up on the next request.
  revalidatePath("/");

  return NextResponse.json({ ok: true, descKo, edited: Boolean(descKo) });
}
