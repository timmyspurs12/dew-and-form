import { NextResponse } from "next/server";
import { getYouCamServerConfig } from "@/lib/youcam/client";
import { YOUCAM_FILE_CONSTRAINTS } from "@/lib/youcam/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const { isConfigured, apiVersion, defaultMode, defaultActions } = getYouCamServerConfig();

  return NextResponse.json(
    {
      liveApiConfigured: isConfigured,
      apiVersion,
      supportedModes: ["sd", "hd"],
      defaultMode,
      defaultActions,
      constraints: YOUCAM_FILE_CONSTRAINTS,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
