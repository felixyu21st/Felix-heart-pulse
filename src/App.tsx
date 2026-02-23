/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';

// --- Constants ---
const CANVAS_WIDTH = 840;
const CANVAS_HEIGHT = 680;
const CANVAS_CENTER_X = CANVAS_WIDTH / 2;
const CANVAS_CENTER_Y = CANVAS_HEIGHT / 2;
const IMAGE_ENLARGE = 11;
const HEART_COLOR = "#FFD700"; // Gold color

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  twinkleSpeed: number;
}

// --- Helper Functions ---

function heartFunction(t: number) {
  // Parametric equations for the heart shape
  let x = 17 * Math.pow(Math.sin(t), 3);
  let y = -(16 * Math.cos(t) - 5 * Math.cos(2 * t) - 3 * Math.cos(3 * t));

  // Enlarge and center
  x *= IMAGE_ENLARGE;
  y *= IMAGE_ENLARGE;
  x += CANVAS_CENTER_X;
  y += CANVAS_CENTER_Y;

  return { x: Math.floor(x), y: Math.floor(y) };
}

function scatterInside(x: number, y: number, beta: number = 0.15) {
  const ratioX = -beta * Math.log(Math.random());
  const ratioY = -beta * Math.log(Math.random());

  const dx = ratioX * (x - CANVAS_CENTER_X);
  const dy = ratioY * (y - CANVAS_CENTER_Y);

  return { x: x - dx, y: y - dy };
}

function shrink(x: number, y: number, ratio: number) {
  const force = -1 / Math.pow(Math.pow(x - CANVAS_CENTER_X, 2) + Math.pow(y - CANVAS_CENTER_Y, 2), 0.6);
  const dx = ratio * force * (x - CANVAS_CENTER_X);
  const dy = ratio * force * (y - CANVAS_CENTER_Y);
  return { x: x - dx, y: y - dy };
}

function curve(p: number) {
  // Custom curve function to adjust the heartbeat cycle
  return 2 * (2 * Math.sin(4 * p)) / (2 * Math.PI);
}

interface Point {
  x: number;
  y: number;
  size: number;
}

class HeartGenerator {
  private points: { x: number; y: number }[] = [];
  private edgeDiffusionPoints: { x: number; y: number }[] = [];
  private centerDiffusionPoints: { x: number; y: number }[] = [];
  private allFrames: Point[][] = [];
  private generateFrame: number;

  constructor(generateFrame: number = 120) {
    this.generateFrame = generateFrame;
    this.build(1000);
    for (let frame = 0; frame < generateFrame; frame++) {
      this.calc(frame);
    }
  }

  private build(number: number) {
    // Heart outline
    for (let i = 0; i < number; i++) {
      const t = Math.random() * 2 * Math.PI;
      const { x, y } = heartFunction(t);
      this.points.push({ x, y });
    }

    // Edge diffusion
    this.points.forEach((p) => {
      for (let i = 0; i < 3; i++) {
        const { x, y } = scatterInside(p.x, p.y, 0.05);
        this.edgeDiffusionPoints.push({ x, y });
      }
    });

    // Center diffusion
    for (let i = 0; i < 5000; i++) {
      const p = this.points[Math.floor(Math.random() * this.points.length)];
      const { x, y } = scatterInside(p.x, p.y, 0.27);
      this.centerDiffusionPoints.push({ x, y });
    }
  }

  private calcPosition(x: number, y: number, ratio: number) {
    const force = 1 / Math.pow(Math.pow(x - CANVAS_CENTER_X, 2) + Math.pow(y - CANVAS_CENTER_Y, 2), 0.420);
    const dx = ratio * force * (x - CANVAS_CENTER_X) + (Math.random() * 2 - 1);
    const dy = ratio * force * (y - CANVAS_CENTER_Y) + (Math.random() * 2 - 1);
    return { x: x - dx, y: y - dy };
  }

  private calc(frame: number) {
    // Slowed down frequency from frame/10 to frame/120
    const ratio = 15 * curve((frame / 120) * Math.PI);
    const haloRadius = Math.floor(4 + 6 * (1 + curve((frame / 120) * Math.PI)));
    const haloNumber = Math.floor(1500 + 2000 * Math.pow(Math.abs(curve((frame / 120) * Math.PI)), 2));

    const framePoints: Point[] = [];

    // Halo
    const haloPointsSet = new Set<string>();
    for (let i = 0; i < haloNumber; i++) {
      const t = Math.random() * 2 * Math.PI;
      let { x, y } = heartFunction(t);
      ({ x, y } = shrink(x, y, haloRadius));

      const key = `${Math.floor(x)},${Math.floor(y)}`;
      if (!haloPointsSet.has(key)) {
        haloPointsSet.add(key);
        x += (Math.random() * 120 - 60);
        y += (Math.random() * 120 - 60);
        const size = Math.random() > 0.33 ? 1 : 2;
        framePoints.push({ x, y, size });
      }
    }

    // Outline
    this.points.forEach((p) => {
      const { x, y } = this.calcPosition(p.x, p.y, ratio);
      const size = Math.floor(Math.random() * 3) + 1;
      framePoints.push({ x, y, size });
    });

    // Edge diffusion
    this.edgeDiffusionPoints.forEach((p) => {
      const { x, y } = this.calcPosition(p.x, p.y, ratio);
      const size = Math.floor(Math.random() * 2) + 1;
      framePoints.push({ x, y, size });
    });

    // Center diffusion
    this.centerDiffusionPoints.forEach((p) => {
      const { x, y } = this.calcPosition(p.x, p.y, ratio);
      const size = Math.floor(Math.random() * 2) + 1;
      framePoints.push({ x, y, size });
    });

    this.allFrames[frame] = framePoints;
  }

  getFramePoints(frame: number): Point[] {
    return this.allFrames[frame % this.generateFrame];
  }
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const heartRef = useRef<HeartGenerator | null>(null);
  const starsRef = useRef<Star[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!heartRef.current) {
      heartRef.current = new HeartGenerator(120);
    }

    // Generate stars once
    if (starsRef.current.length === 0) {
      const stars: Star[] = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * CANVAS_WIDTH,
          y: Math.random() * CANVAS_HEIGHT,
          size: Math.random() * 2,
          opacity: Math.random(),
          twinkleSpeed: 0.01 + Math.random() * 0.03,
        });
      }
      starsRef.current = stars;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Background - Deep Cyberpunk Purple/Black
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Draw Digital Grid
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      
      // Vertical lines
      for (let x = 0; x <= CANVAS_WIDTH; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      // Horizontal lines
      for (let y = 0; y <= CANVAS_HEIGHT; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }

      // Draw Stars (keep them but make them feel like digital noise)
      starsRef.current.forEach((star) => {
        star.opacity += star.twinkleSpeed;
        if (star.opacity > 1 || star.opacity < 0.2) {
          star.twinkleSpeed = -star.twinkleSpeed;
        }
        ctx.fillStyle = `rgba(0, 255, 255, ${star.opacity * 0.5})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      });

      // Neon Scanlines
      ctx.fillStyle = 'rgba(255, 0, 255, 0.02)';
      for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
        ctx.fillRect(0, i, CANVAS_WIDTH, 1);
      }

      // Draw Heart
      const points = heartRef.current!.getFramePoints(frameRef.current);
      
      // Add a slight neon glow to the heart points
      ctx.shadowBlur = 10;
      ctx.shadowColor = HEART_COLOR;
      ctx.fillStyle = HEART_COLOR;

      points.forEach((p) => {
        ctx.fillRect(p.x, p.y, p.size, p.size);
      });
      
      // Reset shadow for other elements
      ctx.shadowBlur = 0;

      frameRef.current += 1;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationId);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a12] flex flex-col items-center justify-center p-4 overflow-hidden font-sans">
      <div className="relative group">
        {/* Cyberpunk Neon Glows */}
        <div 
          className="absolute -inset-4 blur-[120px] opacity-20 bg-cyan-500/20 rounded-full"
        />
        <div 
          className="absolute -inset-4 blur-[120px] opacity-20 bg-magenta-500/20 translate-x-20 rounded-full"
          style={{ backgroundColor: '#ff00ff' }}
        />
        
        <div className="relative z-10 p-1 bg-gradient-to-br from-cyan-500 via-transparent to-magenta-500 rounded-2xl">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="block max-w-full h-auto rounded-xl bg-[#0a0a12]"
          />
        </div>
      </div>

      <div className="mt-12 text-center space-y-4 relative z-20">
        <div className="text-4xl font-serif italic text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.8)] animate-pulse">
          Felix十岁生日快乐
        </div>
        <div className="flex items-center justify-center space-x-4">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
          <p className="text-cyan-400/60 text-xs font-mono uppercase tracking-[0.4em]">
            Neural Pulse Sync
          </p>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
        </div>
      </div>

      {/* Cyberpunk HUD Elements */}
      <div className="absolute top-12 left-12 flex flex-col items-start space-y-6 opacity-40">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 bg-cyan-500 animate-pulse" />
          <span className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">Link_Established</span>
        </div>
        <div className="w-48 h-px bg-gradient-to-r from-cyan-500 to-transparent" />
        <div className="space-y-1">
          <div className="w-32 h-1 bg-cyan-950 rounded-full overflow-hidden">
            <div className="w-2/3 h-full bg-cyan-500" />
          </div>
          <span className="text-[8px] font-mono text-cyan-700 uppercase">Buffer_Load: 67%</span>
        </div>
      </div>
      
      <div className="absolute bottom-12 right-12 flex flex-col items-end space-y-6 opacity-40">
        <div className="text-right space-y-1">
          <span className="block text-[10px] font-mono text-magenta-500 tracking-widest uppercase">Sector_7G</span>
          <span className="block text-[8px] font-mono text-magenta-900 uppercase">Timestamp: {new Date().toLocaleTimeString()}</span>
        </div>
        <div className="w-48 h-px bg-gradient-to-l from-magenta-500 to-transparent" />
        <div className="flex space-x-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="w-1 h-4 bg-magenta-500/20" />
          ))}
        </div>
      </div>
    </div>
  );
}
