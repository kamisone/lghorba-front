import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export const GET = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "GET", `/admin/newsletter/campaigns/${params.id}`);

export const PATCH = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "PATCH", `/admin/newsletter/campaigns/${params.id}`);

export const DELETE = (req: NextRequest, { params }: { params: { id: string } }) =>
  proxyRequest(req, "DELETE", `/admin/newsletter/campaigns/${params.id}`);
