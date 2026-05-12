import { NextRequest } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/cars/${params.id}`);
}

export function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PUT", `/cars/${params.id}`, {
    onSuccess: () => {
      revalidateTag("cars");
      revalidateTag(`car-${params.id}`);
    },
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/cars/${params.id}`, {
    onSuccess: () => {
      revalidateTag("cars");
      revalidateTag(`car-${params.id}`);
    },
  });
}
