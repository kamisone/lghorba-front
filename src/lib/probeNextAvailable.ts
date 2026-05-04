const API = process.env.API_BASE_URL_SERVER ?? "http://127.0.0.1:4000";

// Cache each probe under a per-car availability tag.
// Call revalidateTag(`availability-${carId}`) whenever a booking changes for that car.
export async function probeNextAvailableDate(carId: string): Promise<string | null> {
  const base = new Date();
  base.setUTCHours(10, 0, 0, 0);
  base.setUTCDate(base.getUTCDate() + 1);

  const results = await Promise.allSettled(
    Array.from({ length: 14 }, (_, i) => {
      const d     = new Date(base.getTime() + i * 86_400_000);
      const start = d.toISOString().slice(0, 10) + "T10:00";
      const end   = d.toISOString().slice(0, 10) + "T11:00";
      return fetch(
        `${API}/public/cars/${carId}/availability?startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}`,
        { cache: "force-cache", next: { tags: [`availability-${carId}`] } },
      ).then(r => r.ok ? (r.json() as Promise<{ available: boolean }>) : null);
    }),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled" && r.value?.available === true) {
      return new Date(base.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    }
  }
  return null;
}
