"use client";

import dynamic from "next/dynamic";
import { exampleDiagram } from "@/lib/diagram/example";

const DiagramCanvas = dynamic(() => import("@/components/DiagramCanvas"), {
  ssr: false,
});

export default function Home() {
  return <DiagramCanvas dsl={exampleDiagram} />;
}