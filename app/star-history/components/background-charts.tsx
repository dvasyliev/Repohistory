"use client";

import Image from "next/image";
import { BlurFade } from "@/app/components/magicui/blur-fade";

interface ChartPosition {
  id: string;
  src: string;
  x: number;
  y: number;
  rotation: number;
}

const chartFiles = [
  "/chart1.png",
  "/chart3.png",
  "/chart4.png",
  "/chart5.png",
  "/chart6.png",
];

// Predefined positions for even distribution
const predefinedPositions = [
  { x: 20, y: 20, rotation: -15 },
  { x: 45, y: 85, rotation: 8 },
  { x: 80, y: 75, rotation: -18 },
  { x: 10, y: 85, rotation: -20 },
  { x: 70, y: 20, rotation: 15 },
];

const charts: ChartPosition[] = chartFiles.map((src, index) => ({
  id: `${index}`,
  src,
  x: predefinedPositions[index].x,
  y: predefinedPositions[index].y,
  rotation: predefinedPositions[index].rotation,
}));

export function BackgroundCharts() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {charts.map((chart, index) => (
        <div
          key={chart.id}
          className="absolute"
          style={{
            left: `${chart.x}%`,
            top: `${chart.y}%`,
            transform: `translate(-50%, -50%) rotate(${chart.rotation}deg)`,
          }}
        >
          <BlurFade delay={0.25 + index * 0.2}>
            <div className="brightness-60">
              <Image
                src={chart.src}
                alt=""
                width={400}
                height={250}
                className="h-auto w-80 scale-130 select-none"
                quality={100}
              />
            </div>
          </BlurFade>
        </div>
      ))}
    </div>
  );
}
