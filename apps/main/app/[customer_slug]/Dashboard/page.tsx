"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/Dashboard/Library");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
    </div>
  );
}
