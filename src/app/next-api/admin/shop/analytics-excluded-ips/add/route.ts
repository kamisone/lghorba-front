import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

const PATH = "/admin/platform-settings/analytics-excluded-ips/add";

export const POST = (req: NextRequest) => proxyRequest(req, "POST", PATH);
