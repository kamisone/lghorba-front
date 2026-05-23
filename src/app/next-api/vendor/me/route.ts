import { NextRequest } from "next/server";
import { proxyVendorRequest } from "@/lib/vendorProxy";

export const GET  = (req: NextRequest) => proxyVendorRequest(req, "GET",   "/vendor/me");
export const PATCH = (req: NextRequest) => proxyVendorRequest(req, "PATCH", "/vendor/me");
