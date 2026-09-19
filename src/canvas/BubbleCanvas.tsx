import { useEffect, useRef } from "react";
import { tuning } from "../config/tuning";
import { BubbleManager } from "../bubble/BubbleManager";
import {
  defaultBubbleStyle,
  drawAttachedBubble,
  drawFloatingBubble,
  drawPoppingBubble,
} from "../bubble/bubbleRenderer";
import { drawParticles } from "../particles/PopParticles";
import { defaultWandStyle, drawWand } from "../wand/Wand";
import { attachPointerInput } from "../input/touch";
import { drawBackground } from "../background/Background";

export default function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let wandX = 0;
    let wandY = 0;
    let scale = 1;

    const manager = new BubbleManager(0, 0);

    function layout() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      wandX = width / 2;
      wandY = height - Math.min(height * 0.16, 130);
      scale = Math.min(1.15, Math.max(0.85, width / 390));
      manager.setWandPosition(wandX, wandY);
    }

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);

    // --- fake breath input (Phase 1/2 dev stand-in for the microphone) ---
    let pressed = false;
    let swipeConsumedThisGesture = false;
    let hasStartedBlowing = false;
    let introFadeStart: number | null = null;
    let hasShownPopHint = false;
    let popHint: { bubbleId: number; startTime: number } | null = null;

    manager.onDetach = () => {
      if (!hasShownPopHint) {
        hasShownPopHint = true;
        const latest = manager.floating[manager.floating.length - 1];
        if (latest) popHint = { bubbleId: latest.id, startTime: performance.now() };
      }
    };

    const detachInput = attachPointerInput(canvas, {
      hitTestPop: (x, y) => manager.tryPopAt(x, y),
      onDown: () => {
        pressed = true;
        swipeConsumedThisGesture = false;
        if (!hasStartedBlowing) {
          hasStartedBlowing = true;
          introFadeStart = performance.now();
        }
      },
      onMove: (dx, dy, elapsedMs) => {
        if (swipeConsumedThisGesture) return;
        const upDistance = -dy; // negative dy == dragged upward
        if (upDistance < tuning.swipeDetachThreshold) return;

        const seconds = Math.max(0.05, elapsedMs / 1000);
        const dragSpeed = upDistance / seconds;
        const flingBoost = Math.min(tuning.swipeFlingMaxBoost, dragSpeed * tuning.swipeFlingMultiplier);
        const flingVx = (dx / seconds) * 0.25;

        if (manager.detachAttached(flingVx, flingBoost)) {
          swipeConsumedThisGesture = true;
          pressed = false;
        }
      },
      onUp: () => {
        // Releasing just pauses the blow — the held bubble keeps its size.
        pressed = false;
      },
    });

    let rafId = 0;
    let lastTime = performance.now();
    let breathStrength = 0;

    function frame(now: number) {
      const dtMs = Math.min(48, now - lastTime);
      lastTime = now;
      const timeSec = now / 1000;

      breathStrength += ((pressed ? 1 : 0) - breathStrength) * tuning.breathRamp;
      manager.update(dtMs, breathStrength);

      const sky = drawBackground(ctx!, width, height, timeSec);
      const visibilityBoost = sky.brightness * 0.35;

      drawWand(ctx!, defaultWandStyle, wandX, wandY, scale);
      drawAttachedBubble(ctx!, defaultBubbleStyle, manager.attached, timeSec, visibilityBoost);

      for (const b of manager.floating) {
        if (b.state === "floating") {
          drawFloatingBubble(ctx!, defaultBubbleStyle, b, timeSec, now, visibilityBoost);
        } else if (b.state === "popped") {
          const progress = Math.min(1, (now - b.poppedAt) / tuning.popDuration);
          drawPoppingBubble(ctx!, defaultBubbleStyle, b, progress, timeSec, visibilityBoost);
        }
      }

      drawParticles(ctx!, manager.particles);

      const introY = height * 0.32; // clear sky, above the city silhouette
      if (introFadeStart === null) {
        drawCenteredText(ctx!, "후— 불어봐", width / 2, introY, 1);
      } else {
        const t = (now - introFadeStart) / 400;
        if (t < 1) {
          drawCenteredText(ctx!, "후— 불어봐", width / 2, introY, 1 - t);
        }
      }

      if (popHint) {
        const b = manager.floating.find((fb) => fb.id === popHint!.bubbleId);
        const elapsed = now - popHint.startTime;
        if (b && b.state === "floating" && elapsed < 1600) {
          const alpha = elapsed < 1200 ? 1 : 1 - (elapsed - 1200) / 400;
          drawCenteredText(ctx!, "톡!", b.x, b.y - b.radius - 20, Math.max(0, alpha));
        } else {
          popHint = null;
        }
      }

      rafId = requestAnimationFrame(frame);
    }

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", layout);
      window.removeEventListener("orientationchange", layout);
      detachInput();
    };
  }, []);

  return <canvas ref={canvasRef} />;
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  alpha: number
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "300 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.restore();
}
