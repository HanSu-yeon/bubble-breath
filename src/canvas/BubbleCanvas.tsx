import { DRONE_SHOW_SECONDS } from "../background/droneThemes";
import { droneSchedule } from "../background/droneSchedule";
import { useEffect, useRef, useState } from "react";
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
import { currentHour } from "../background/skyTime";
import { drawBackground } from "../background/Background";

import { PopSound } from "../audio/popSound";
import { BreathDetector, type MicrophoneStatus } from "../audio/breathDetector";

export default function BubbleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const soundRef = useRef<PopSound | null>(null);
  const detectorRef = useRef<BreathDetector | null>(null);
  const [micStatus, setMicStatus] = useState<MicrophoneStatus>("idle");
  const [micError, setMicError] = useState("");
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const sound = new PopSound();
    soundRef.current = sound;
    const unlockSound = () => sound.unlock();
    canvas.addEventListener("pointerdown", unlockSound, true);
    const detector = new BreathDetector((status, message) => {
      setMicStatus(status);
      setMicError(message ?? "");
    });
    detectorRef.current = detector;
    const onVisibility = () => { if (document.hidden) detector.stop(); };
    document.addEventListener("visibilitychange", onVisibility);

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
      wandY = height * 0.875;
      scale = Math.min(width * 0.078, height * 0.074) * 0.8 / defaultWandStyle.ringRadius;
      const ringRadius = defaultWandStyle.ringRadius * scale;
      const maxRadius = Math.max(tuning.bubbleMinRadius,
        Math.min(width * 0.36, (wandY - ringRadius - height * 0.12) / 2.05));
      manager.setWandPosition(wandX, wandY, ringRadius, maxRadius);
    }

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);

    // Touch controls release and pop; growth comes from the microphone.
    let swipeConsumedThisGesture = false;
    let hasStartedBlowing = false;
    let introFadeStart: number | null = null;
    let hasShownPopHint = false;
    let popHint: { bubbleId: number; startTime: number } | null = null;

    manager.onPop = () => sound.play();
    manager.onBurst = () => sound.play();
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
        swipeConsumedThisGesture = false;
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
        }
      },
      onUp: () => {},
    });

    const previewDroneShow = new URLSearchParams(window.location.search).get("show") === "drones";
    const requestedShowHour = Number(new URLSearchParams(window.location.search).get("hour") ?? 20);
    const showHour = Number.isInteger(requestedShowHour) && requestedShowHour >= 18 && requestedShowHour <= 23 ? requestedShowHour : 20;
    const previewScene = new URLSearchParams(window.location.search).get("scene");
    const previewOffset = ({ office: 80, tired: 100, desk: 120, driver: 140 } as Record<string, number>)[previewScene ?? ""] ?? 0;
    const showStartedAt = performance.now();
    let rafId = 0;
    let lastTime = performance.now();

    function frame(now: number) {
      const dtMs = Math.min(48, now - lastTime);
      lastTime = now;
      const timeSec = now / 1000;

      const breathStrength = detector.sample(dtMs);
      if (manager.attached.radius >= tuning.detachMinRadius && !hasStartedBlowing) {
        hasStartedBlowing = true;
        introFadeStart = now;
      }
      manager.update(dtMs, breathStrength);

      const previewElapsed = previewOffset + (now - showStartedAt) / 1000;
      const hour = previewDroneShow && previewElapsed < DRONE_SHOW_SECONDS
        ? showHour + 35 / 60 + previewElapsed / 3600
        : currentHour();
      const sky = drawBackground(ctx!, width, height, timeSec, hour);
      const visibilityBoost = sky.brightness * 0.35;

      drawAttachedBubble(ctx!, defaultBubbleStyle, manager.attached, timeSec, visibilityBoost,
        { x: wandX, y: wandY, radius: defaultWandStyle.ringRadius * scale });
      drawWand(ctx!, defaultWandStyle, wandX, wandY, scale);

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
      if (droneSchedule(hour).active) {
        // Keep the center clear while the sky show is running.
      } else if (introFadeStart === null) {
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
      document.removeEventListener("visibilitychange", onVisibility);
      detector.stop();
      detectorRef.current = null;
      canvas.removeEventListener("pointerdown", unlockSound, true);
      sound.dispose();
      soundRef.current = null;
    };
  }, []);

  const active = micStatus === "ready" || micStatus === "calibrating";
  return <>
    <canvas ref={canvasRef} aria-label="마이크에 바람을 불면 커진 비눗방울이 저절로 날아가요. 터치해서 터뜨려 보세요. 무지개 분수는 매일 18시부터 다음날 4시까지, 드론쇼는 18시부터 23시까지 매시 35분에 2분 48초간 열려요." />
    <div className="microphone-controls">
      {!active && <p role="status" aria-live="polite">
        {micStatus === "error" ? micError
          : micStatus === "requesting" ? "마이크 사용을 허용해 주세요"
          : "마이크를 켜고, 후— 불어 보세요"}
      </p>}
      <button type="button" disabled={micStatus === "requesting"}
        onClick={() => {
          soundRef.current?.unlock();
          if (active) detectorRef.current?.stop();
          else void detectorRef.current?.start();
        }}>
        {active ? "마이크 끄기" : micStatus === "requesting" ? "연결 중…" : micStatus === "error" ? "다시 시도" : "마이크 켜기"}
      </button>
    </div>
  </>;
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
