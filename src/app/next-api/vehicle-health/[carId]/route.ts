import { NextRequest } from "next/server";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { carId: string } }) {
  return proxyRequest(req, "GET", `/vehicle-health/${params.carId}`);
}

export function PUT(req: NextRequest, { params }: { params: { carId: string } }) {
  return proxyRequest(req, "PUT", `/vehicle-health/${params.carId}`);
}
