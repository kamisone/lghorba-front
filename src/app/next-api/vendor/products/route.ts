import { NextRequest } from "next/server";
import { proxyVendorRequest } from "@/lib/vendorProxy";

export const GET = (req: NextRequest) => proxyVendorRequest(req, "GET", "/vendor/products");
