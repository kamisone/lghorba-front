import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

const PATH = "/admin/platform-settings/analytics-bot-user-agents";

export const GET = (req: NextRequest) => proxyRequest(req, "GET", PATH);
export const PUT = (req: NextRequest) => proxyRequest(req, "PUT", PATH);
