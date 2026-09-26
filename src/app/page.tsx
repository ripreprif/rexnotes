"use client";

import dynamic from "next/dynamic";

// DiagramCanvas di-import secara dynamic dengan ssr:false karena
// Excalidraw tidak bisa di-render di server.
const DiagramCanvas = dynamic(() => import("@/components/DiagramCanvas"), {
  ssr: false,
});

export default function Home() {
  return <DiagramCanvas />;
}