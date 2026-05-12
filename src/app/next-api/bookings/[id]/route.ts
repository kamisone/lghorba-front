import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { proxyRequest } from "@/lib/proxy";

export function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "GET", `/bookings/${params.id}`);
}

export function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PUT", `/bookings/${params.id}`, {
    onSuccess: (_, body) => {
      revalidateTag("cars");
      const b = body as { carId?: string } | undefined;
      if (b?.carId) revalidateTag(`availability-${b.carId}`);
    },
  });
}

export function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "PATCH", `/bookings/${params.id}/status`, {
    onSuccess: (_, body) => {
      revalidateTag("cars");
      const b = body as { carId?: string } | undefined;
      if (b?.carId) revalidateTag(`availability-${b.carId}`);
    },
  });
}

export function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return proxyRequest(req, "DELETE", `/bookings/${params.id}`, {
    onSuccess: () => revalidateTag("cars"),
  });
}
