import { NextRequest } from "next/server";
import { proxyVendorRequest } from "@/lib/vendorProxy";

export const POST = (req: NextRequest) => proxyVendorRequest(req, "POST", "/vendor/onboarding/link");
