"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const customerSlug = params.customer_slug as string;

  useEffect(() => {
    router.push(`/${customerSlug}/Dashboard/Library`);
  }, [router, customerSlug]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
    </div>
  );
}
