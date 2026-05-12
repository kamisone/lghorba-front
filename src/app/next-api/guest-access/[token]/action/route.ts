import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function POST(req: NextRequest, { params }: { params: { token: string } }) {
  return proxyRequest(req, "POST", `/guest-access/${params.token}/action`, {
    auth: false,
    extraHeaders: {
      "x-forwarded-for": req.headers.get("x-forwarded-for") ?? "",
      "user-agent": req.headers.get("user-agent") ?? "",
    },
  });
}
