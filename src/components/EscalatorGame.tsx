import React, { useRef, useState, useEffect } from "react";
import { Stamp, SafetyTaskType } from "../types";
import { SAFETY_TASKS } from "../data/tasks";
import { Camera, AlertCircle, RefreshCw, CheckCircle2, Play, CircleDot, Sparkles } from "lucide-react";

interface EscalatorGameProps {
  onAddStamp: (taskId: SafetyTaskType, score: number) => void;
  stamps: Stamp[];
}

export default function EscalatorGame({ onAddStamp, stamps }: EscalatorGameProps) {
  const [gameMode, setGameMode] = useState<"line" | "handrail">("line");
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [webcamStatus, setWebcamStatus] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [gameState, setGameState] = useState<"ready" | "playing" | "failed" | "passed">("ready");
  
  // Game countdown metrics
  const [countdown, setCountdown] = useState<number>(10);
  const [gripProgress, setGripProgress] = useState<number>(0);
  const [gameMessage, setGameMessage] = useState<string>("초록 버튼을 누르면 시작해요! 준비 완료! 💛");
  const [warningActive, setWarningActive] = useState<boolean>(false);

  // 3-second countdown before game starts
  const [startTimer, setStartTimer] = useState<number | null>(null);

  // Character Simulator States & Interactive coordinates for dragging
  const [charPos, setCharPos] = useState({ x: 240, y: 355 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  // Character Simulator States (Alternative if webcam not available)
  const [simFeetInCorrectArea, setSimFeetInCorrectArea] = useState<boolean>(true);
  const [simHoldingHandrail, setSimHoldingHandrail] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameData = useRef<ImageData | null>(null);

  // Play adorable kid-friendly synthesised sound effects
  const playSound = (type: "beep" | "success" | "fail" | "happy") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "beep") {
        // Cute high alert beep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "success") {
        // Bright upward kids chime arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.18);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.08);
          osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
        });
      } else if (type === "fail") {
        // Soft cartoon "boing" buzzer
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "happy") {
        // Jumping sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  // Turn on/off Webcam
  useEffect(() => {
    if (useWebcam) {
      setWebcamStatus("requesting");
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current?.play();
              setWebcamStatus("active");
            };
          }
        })
        .catch((err) => {
          console.error("Webcam request failed:", err);
          setWebcamStatus("error");
          setUseWebcam(false); // Fail back to character simulator
        });
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [useWebcam]);

  const stopWebcam = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setWebcamStatus("idle");
  };

  // pre-game 3-second countdown before training starts
  useEffect(() => {
    if (startTimer === null) return;
    if (startTimer === 0) {
      setStartTimer(null);
      setGameState("playing");
      setCountdown(10);
      setGripProgress(0);
      setWarningActive(false);
      if (gameMode === "line") {
        setGameMessage("안전구역 한가운데에 바르게 똑똑하게 서기 놀이! 10초 동안 버텨요! 🎈");
      } else {
        setGameMessage("기차가 움직여요! 오른쪽 핑크/블루 고무 손잡이를 이쁘게 꼭 잡아요!");
      }
      playSound("happy");
      return;
    }
    const t = setTimeout(() => {
      setStartTimer((prev) => (prev !== null ? prev - 1 : null));
      playSound("beep");
    }, 1000);
    return () => clearTimeout(t);
  }, [startTimer, gameMode]);

  // Gameplay Loops (Countdown timer or grip incrementer)
  useEffect(() => {
    let timer: any = null;
    if (gameState === "playing") {
      timer = setInterval(() => {
        if (gameMode === "line") {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameState("passed");
              onAddStamp("escalator_line", 100);
              playSound("success");
              setGameMessage("와아! 🎉 10초 동안 노란 번개선 안쪽에 이쁘게 서서 타기 성공! 스탬프를 줄게요!");
              return 0;
            }

            // Real-time checking (depending on simulator or webcam)
            if (!useWebcam) {
              if (!simFeetInCorrectArea) {
                setGameState("failed");
                playSound("fail");
                setGameMessage("앗차차! 노란색 선을 밟아서 삐익! 쿵했어요. 다시 조심히 도전해보아요!");
                clearInterval(timer);
              }
            }
            return prev - 1;
          });
        } else {
          // Handrail mode (always exactly 10 seconds)
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setGameState("passed");
              onAddStamp("escalator_handrail", 100);
              playSound("success");
              setGameMessage("참 잘했어요! ✊ 손잡이를 꽉 잡고 안전하게 꼭대기까지 올라갔어요! 스탬프 팡팡!");
              return 0;
            }

            const isHolding = useWebcam ? gripProgress > 15 : simHoldingHandrail;
            if (isHolding) {
              setGripProgress((p) => Math.min(100, p + 10));
              setWarningActive(false);
            } else {
              setGripProgress((p) => Math.max(0, p - 10));
              setWarningActive(true);
              setGameMessage("아이쿠! 🖐️ 얼른 손을 꺼내서 둥근 파란/핑크 손잡이를 꼭 잡아주세요!");
              playSound("beep");
            }

            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [gameState, gameMode, useWebcam, simFeetInCorrectArea, simHoldingHandrail, gripProgress]);

  // Main Canvas Render & Motion Differencing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let localFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (useWebcam && webcamStatus === "active" && video) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const width = canvas.width;
        const height = canvas.height;

        if (gameState === "playing") {
          const leftLine = { x: 50, y: height - 100, w: 120, h: 60 };
          const rightLine = { x: width - 170, y: height - 100, w: 120, h: 60 };
          const gripArea = { x: width - 160, y: 130, w: 100, h: 100 };

          const currentLeft = ctx.getImageData(leftLine.x, leftLine.y, leftLine.w, leftLine.h);
          const currentRight = ctx.getImageData(rightLine.x, rightLine.y, rightLine.w, rightLine.h);
          const currentGrip = ctx.getImageData(gripArea.x, gripArea.y, gripArea.w, gripArea.h);

          let leftDiff = 0;
          let rightDiff = 0;
          let gripDiff = 0;

          if (prevFrameData.current) {
            const step = 4;

            // Coordinate-mapped motion detection for Left Line
            for (let cy = 0; cy < leftLine.h; cy += step) {
              for (let cx = 0; cx < leftLine.w; cx += step) {
                const ax = leftLine.x + cx;
                const ay = leftLine.y + cy;
                const fullIndex = (ay * width + ax) * 4;
                const cropIndex = (cy * leftLine.w + cx) * 4;
                const rDiff = Math.abs(currentLeft.data[cropIndex] - (prevFrameData.current?.data[fullIndex] || 0));
                if (rDiff > 40) leftDiff++;
              }
            }

            // Coordinate-mapped motion detection for Right Line
            for (let cy = 0; cy < rightLine.h; cy += step) {
              for (let cx = 0; cx < rightLine.w; cx += step) {
                const ax = rightLine.x + cx;
                const ay = rightLine.y + cy;
                const fullIndex = (ay * width + ax) * 4;
                const cropIndex = (cy * rightLine.w + cx) * 4;
                const rDiff = Math.abs(currentRight.data[cropIndex] - (prevFrameData.current?.data[fullIndex] || 0));
                if (rDiff > 40) rightDiff++;
              }
            }

            // Coordinate-mapped motion detection for Grip Area
            for (let cy = 0; cy < gripArea.h; cy += step) {
              for (let cx = 0; cx < gripArea.w; cx += step) {
                const ax = gripArea.x + cx;
                const ay = gripArea.y + cy;
                const fullIndex = (ay * width + ax) * 4;
                const cropIndex = (cy * gripArea.w + cx) * 4;
                const rDiff = Math.abs(currentGrip.data[cropIndex] - (prevFrameData.current?.data[fullIndex] || 0));
                if (rDiff > 40) gripDiff++;
              }
            }

            const leftRatio = leftDiff / ((leftLine.w * leftLine.h) / (step * step));
            const rightRatio = rightDiff / ((rightLine.w * rightLine.h) / (step * step));
            const gripRatio = gripDiff / ((gripArea.w * gripArea.h) / (step * step));

            if (gameMode === "line") {
              if (leftRatio > 0.12 || rightRatio > 0.12) {
                setWarningActive(true);
                playSound("beep");
                setGameState("failed");
                setGameMessage("아이쿠! 노란 안전선을 건드리셨어요! 두 발을 이쁘게 모으고 얌전히 서 있어 보아요.");
              } else {
                setWarningActive(false);
              }
            } else if (gameMode === "handrail") {
              if (gripRatio > 0.05) {
                setGripProgress((prev) => {
                  if (prev >= 100) {
                    setGameState("passed");
                    onAddStamp("escalator_handrail", 100);
                    playSound("success");
                    setGameMessage("최고예요! 💖 손잡이를 야무지게 꼭 쥐고 성공 수리에 도달했습니다!");
                    return 100;
                  }
                  return prev + 0.15; // Slow down to take exactly ~10 seconds
                });
                setWarningActive(false);
              } else {
                setGripProgress((prev) => Math.max(0, prev - 0.2));
                setWarningActive(true);
              }
            }
          }
          prevFrameData.current = ctx.getImageData(0, 0, width, height);
        }

        drawWebcamOverlays(ctx, canvas.width, canvas.height);
      } else {
        drawSimulatedCharacter(ctx, canvas.width, canvas.height);
      }

      localFrameId = requestAnimationFrame(render);
    };

    localFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(localFrameId);
  }, [useWebcam, webcamStatus, gameMode, gameState, simFeetInCorrectArea, simHoldingHandrail, gripProgress]);

  // Render webcam graphical guides
  const drawWebcamOverlays = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(50, h);
    ctx.lineTo(180, 100);
    ctx.moveTo(w - 50, h);
    ctx.lineTo(w - 180, 100);
    ctx.stroke();

    if (gameMode === "line") {
      const flashColor = warningActive && Date.now() % 500 < 250 ? "rgba(244, 63, 94, 0.7)" : "rgba(245, 158, 11, 0.5)";
      ctx.fillStyle = flashColor;
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 4;

      ctx.fillRect(40, h - 90, 130, 50);
      ctx.strokeRect(40, h - 90, 130, 50);
      ctx.fillRect(w - 170, h - 90, 130, 50);
      ctx.strokeRect(w - 170, h - 90, 130, 50);

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("⚠️ 밟으면 아야! 선", 105, h - 100);
      ctx.fillText("⚠️ 밟으면 아야! 선", w - 105, h - 100);

      // Safe stand zone
      ctx.strokeStyle = "#10b981";
      ctx.strokeRect(200, h - 110, w - 400, 80);
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)";
      ctx.fillRect(200, h - 110, w - 400, 80);
      ctx.fillStyle = "#10b981";
      ctx.fillText("🌈 안전 구역 (여기에 이쁘게 서기!)", w / 2, h - 65);
    }

    if (gameMode === "handrail") {
      const isHolding = gripProgress > 10;
      ctx.strokeStyle = isHolding ? "#10b981" : "#ec4899";
      ctx.fillStyle = isHolding ? "rgba(16, 185, 129, 0.2)" : "rgba(236, 72, 153, 0.15)";
      ctx.lineWidth = 4;
      
      const box = { x: w - 160, y: 130, w: 100, h: 100 };
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.strokeRect(box.x, box.y, box.w, box.h);

      ctx.beginPath();
      ctx.arc(box.x + 50, box.y + 50, 20, 0, Math.PI * 2);
      ctx.fillStyle = isHolding ? "#10b981" : "#ec4899";
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.fillText(isHolding ? "✊ 이쁘게 잡았어요!" : "🖐️ 손바닥을 대세요", box.x + 50, box.y - 12);
    }
  };

  // Draw simulated cartoon escalator + safety characters with adorable details
  const drawSimulatedCharacter = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // 1. Cozy cartoon pastel green/sky blue backdrop
    ctx.fillStyle = "#e0f2fe"; // bright sky blue
    ctx.fillRect(0, 0, w, h);

    // Decorative floating fluffy white clouds
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    const cloudTime = Date.now() / 4000;
    
    // Cloud 1
    const c1X = (w * 0.1) + Math.sin(cloudTime) * 15;
    ctx.beginPath();
    ctx.arc(c1X, 60, 20, 0, Math.PI * 2);
    ctx.arc(c1X + 15, 50, 25, 0, Math.PI * 2);
    ctx.arc(c1X + 35, 60, 20, 0, Math.PI * 2);
    ctx.fill();

    // Cloud 2
    const c2X = (w * 0.7) - Math.sin(cloudTime + 1) * 15;
    ctx.beginPath();
    ctx.arc(c2X, 75, 18, 0, Math.PI * 2);
    ctx.arc(c2X + 15, 65, 22, 0, Math.PI * 2);
    ctx.arc(c2X + 32, 75, 18, 0, Math.PI * 2);
    ctx.fill();

    // Soft Green Hills at the bottom back
    ctx.fillStyle = "#bbf7d0"; // very soft pastel green
    ctx.beginPath();
    ctx.ellipse(w / 4, h, w / 2, h / 4, 0, 0, Math.PI * 2);
    ctx.ellipse(w * 0.8, h, w / 2.5, h / 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Beautiful Cartoon Escalator Steps - colored bright candy grey/pink
    ctx.fillStyle = "#f1f5f9"; // white-ish slate steps
    ctx.fillRect(150, 90, 180, h - 90);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 3;
    // Sloped escalator steps ribs with dynamic movement
    for (let y = 110; y < h; y += 45) {
      const offset = (Date.now() / 20) % 45;
      const stepY = y + offset;
      if (stepY < h) {
        ctx.beginPath();
        ctx.moveTo(150, stepY);
        ctx.lineTo(330, stepY);
        ctx.stroke();

        // Draw cute little star sparkles inside steps occasionally!
        if (Math.floor(stepY) % 3 === 0) {
          ctx.fillStyle = "rgba(253, 224, 71, 0.4)";
          ctx.font = "12px sans-serif";
          ctx.fillText("✨", 180 + (Math.floor(stepY) % 80), stepY - 15);
        }
      }
    }

    // Friendly face on escalator header block!
    ctx.fillStyle = "#fef08a"; // soft yellow
    ctx.beginPath();
    ctx.roundRect(190, 45, 100, 35, 12);
    ctx.fill();
    ctx.strokeStyle = "#ca8a04";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Escalator eyes & smiling tongue face
    ctx.fillStyle = "#854d0e";
    ctx.beginPath();
    ctx.arc(225, 58, 3, 0, Math.PI * 2);
    ctx.arc(255, 58, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(240, 64, 5, 0, Math.PI);
    ctx.stroke();

    // 3. Yellow/Orange Neon Safety Lines (Borders of the steps)
    ctx.fillStyle = "#fbbf24";
    ctx.fillRect(150, 90, 10, h - 90); // Left yellow border
    ctx.fillRect(320, 90, 10, h - 90); // Right yellow border

    // 4. Moving Soft Rubber Pink/Blue Handrail (Left and Right)
    ctx.fillStyle = "#38bdf8"; // Pastel Sky Blue Handrail
    ctx.fillRect(125, 40, 20, h - 40); // Left handrail
    ctx.fillStyle = "#ec4899"; // Pastel Sweet Pink Handrail
    ctx.fillRect(335, 40, 20, h - 40); // Right handrail

    // Drawing warning hazard lines at bottom step
    if (gameMode === "line") {
      ctx.fillStyle = !simFeetInCorrectArea && Date.now() % 500 < 250 ? "#ef4444" : "#f59e0b";
      ctx.fillRect(150, h - 55, 180, 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("⚡ 노란색 선 (조심조심!) ⚡", 240, h - 46);
    }

    // 5. Draw Highly Adorable Safety Kid with Bear Ears on Cap
    const kidX = charPos.x;
    const kidY = charPos.y;

    // Bear Ears on head
    ctx.fillStyle = "#f472b6"; // bright sweet pink ears
    ctx.strokeStyle = "#4c1d95";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(kidX - 16, kidY - 58, 8, 0, Math.PI * 2);
    ctx.arc(kidX + 16, kidY - 58, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Inner ear
    ctx.fillStyle = "#ffccd5";
    ctx.beginPath();
    ctx.arc(kidX - 16, kidY - 58, 4, 0, Math.PI * 2);
    ctx.arc(kidX + 16, kidY - 58, 4, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(kidX, kidY - 40, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe4e6"; // baby peach skin
    ctx.fill();
    ctx.stroke();

    // Blushing cute cheeks
    ctx.fillStyle = "rgba(244, 114, 182, 0.4)";
    ctx.beginPath();
    ctx.arc(kidX - 12, kidY - 35, 4, 0, Math.PI * 2);
    ctx.arc(kidX + 12, kidY - 35, 4, 0, Math.PI * 2);
    ctx.fill();

    // Face eyes and smile
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(kidX - 8, kidY - 43, 2.5, 0, Math.PI * 2); // left eye
    ctx.arc(kidX + 8, kidY - 43, 2.5, 0, Math.PI * 2); // right eye
    ctx.fill();

    ctx.beginPath();
    if (gameState === "failed") {
      ctx.arc(kidX, kidY - 30, 5, Math.PI, 0); // sad arch
    } else {
      ctx.arc(kidX, kidY - 32, 6, 0, Math.PI); // smile arch
    }
    ctx.stroke();

    // Sweet Lavender Shirt
    ctx.fillStyle = "#c084fc"; // pastel purple vest
    ctx.beginPath();
    ctx.roundRect(kidX - 18, kidY - 15, 36, 48, 10);
    ctx.fill();
    ctx.stroke();

    // Cute yellow ducky badge on shirt
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(kidX, kidY + 8, 6, 0, Math.PI * 2);
    ctx.fill();

    // Left Arm (Standard hanging down)
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(kidX - 18, kidY - 10);
    ctx.lineTo(kidX - 32, kidY + 12);
    ctx.stroke();

    // Right Arm (Holding Handrail)
    ctx.beginPath();
    ctx.moveTo(kidX + 18, kidY - 10);
    if (gameMode === "handrail" && simHoldingHandrail) {
      ctx.lineTo(kidX + 40, kidY - 26); // elevated arm to grip rail
      ctx.stroke();
      // Draw a yellow hand star gripper
      ctx.fillStyle = "#facc15";
      ctx.beginPath();
      ctx.arc(kidX + 42, kidY - 28, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.lineTo(kidX + 32, kidY + 12);
      ctx.stroke();
    }

    // Legs
    const leftFootX = simFeetInCorrectArea ? kidX - 9 : kidX - 32;
    const rightFootX = simFeetInCorrectArea ? kidX + 9 : kidX + 32;

    ctx.beginPath();
    ctx.moveTo(kidX - 9, kidY + 33);
    ctx.lineTo(leftFootX, kidY + 62);
    ctx.moveTo(kidX + 9, kidY + 33);
    ctx.lineTo(rightFootX, kidY + 62);
    ctx.stroke();

    // Cute neon striped yellow/white shoes
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.roundRect(leftFootX - 8, kidY + 62, 16, 7, 4);
    ctx.roundRect(rightFootX - 8, kidY + 62, 16, 7, 4);
    ctx.fill();
    ctx.stroke();

    // Stars floating around head on success!
    if (gameState === "passed") {
      ctx.fillStyle = "#facc15";
      ctx.font = "16px sans-serif";
      ctx.fillText("⭐", kidX - 35, kidY - 70);
      ctx.fillText("💖", kidX + 35, kidY - 75);
      ctx.fillText("👑", kidX, kidY - 85);
    }

    ctx.fillStyle = "#4c1d95";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("🧸 아기 지킴이 연습 인형", w - 100, 25);
  };

  // Drag coordinate & safety helpers for simulated character
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
  };

  const handleCanvasDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (useWebcam) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    
    // Check if clicked close to the character's head/body (offset centered slightly)
    const dist = Math.hypot(coords.x - charPos.x, coords.y - (charPos.y - 20));
    if (dist < 80) {
      isDraggingRef.current = true;
      setIsDragging(true);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDraggingRef.current) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    
    // Bounds for escalator character: X inside step boundaries, Y within vertical walk bounds
    const nextX = Math.max(130, Math.min(350, coords.x));
    const nextY = Math.max(200, Math.min(410, coords.y));
    setCharPos({ x: nextX, y: nextY });
  };

  const handleCanvasUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
  };

  // Monitor simulated character position and update safety triggers in real-time
  useEffect(() => {
    if (useWebcam) return;
    if (gameMode === "line") {
      const isSafe = charPos.x > 165 && charPos.x < 315;
      setSimFeetInCorrectArea(isSafe);
    } else {
      const isHolding = charPos.x > 290;
      setSimHoldingHandrail(isHolding);
    }
  }, [charPos, gameMode, useWebcam]);

  const startGame = () => {
    playSound("happy");
    setStartTimer(3); // Start with 3-second countdown
    setGameState("ready");
    setCountdown(10);
    setGripProgress(0);
    setWarningActive(false);
    setCharPos({ x: 240, y: 355 }); // Reset to middle
  };

  const resetGame = () => {
    setGameState("ready");
    setStartTimer(null);
    setCountdown(10);
    setGripProgress(0);
    setWarningActive(false);
    setCharPos({ x: 240, y: 355 }); // Reset to middle
    setGameMessage("초록 버튼을 누르면 시작해요! 준비 완료! 💛");
  };

  return (
    <div className="space-y-6" id="escalator-game">
      
      {/* Category Header - Pastel cloud look */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-[2rem] border-4 border-amber-200/60 shadow-sm text-left">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 bg-amber-200 text-amber-900 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider animate-bounce-slow">
            🎈 에스컬레이터 모험 놀이터 🎠
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display">
            동글동글 안전선과 손잡이 미션!
          </h2>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            카메라 앞에 서거나 귀여운 연습 인형을 조종해서 참 잘했어요 스탬프를 가득 획득해 보아요! 😊
          </p>
        </div>

        {/* Level Switch Tab - Highly rounded and bright */}
        <div className="flex bg-amber-100/50 p-1.5 rounded-2xl border-2 border-amber-200 self-start md:self-auto shadow-inner">
          <button
            onClick={() => {
              setGameMode("line");
              resetGame();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === "line"
                ? "bg-amber-400 text-slate-900 shadow border border-amber-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            👣 1단계: 번개선 안쪽에 서기
          </button>
          <button
            onClick={() => {
              setGameMode("handrail");
              resetGame();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === "handrail"
                ? "bg-rose-400 text-white shadow border border-rose-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            ✊ 2단계: 동글 손잡이 잡기
          </button>
        </div>
      </div>

      {/* Main Educational Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Interactive Play Area (Video Frame + Canvas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-950 rounded-[2rem] overflow-hidden relative shadow-md border-4 border-slate-800 aspect-[4/3]">
            
            {useWebcam && (
              <video
                ref={videoRef}
                playsInline
                muted
                className="hidden"
                width={640}
                height={480}
              />
            )}

            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="w-full h-full block object-cover cursor-grab active:cursor-grabbing"
              onMouseDown={handleCanvasDown}
              onMouseMove={handleCanvasMove}
              onMouseUp={handleCanvasUp}
              onMouseLeave={handleCanvasUp}
              onTouchStart={handleCanvasDown}
              onTouchMove={handleCanvasMove}
              onTouchEnd={handleCanvasUp}
            />

            {/* Warning Flashing Overlay - Adorable alert */}
            {warningActive && gameState === "playing" && (
              <div className="absolute inset-0 bg-rose-500/20 border-[12px] border-rose-500 animate-pulse pointer-events-none flex items-center justify-center">
                <div className="bg-rose-600 border-2 border-white text-white px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl animate-bounce">
                  <span className="text-xl">⚠️</span>
                  <span className="font-black text-xs sm:text-sm">
                    {gameMode === "line" ? "아야! 노란 번개선에 발이 닿았어요!" : "앗! 얼른 손잡이를 꽉 잡으세요!"}
                  </span>
                </div>
              </div>
            )}

            {/* 3-Second Countdown Overlay */}
            {startTimer !== null && (
              <div className="absolute inset-0 bg-slate-900/85 flex flex-col items-center justify-center text-white z-20">
                <div className="bg-yellow-400 text-slate-900 w-24 h-24 rounded-full flex items-center justify-center font-black text-5xl shadow-lg animate-bounce">
                  {startTimer}
                </div>
                <div className="text-xl font-black text-yellow-300 mt-6 font-display">
                  🚦 {startTimer}초 뒤에 훈련이 시작됩니다! 🚦
                </div>
              </div>
            )}

            {/* Webcam Requesting Backdrop */}
            {useWebcam && webcamStatus === "requesting" && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-pink-400" />
                <p className="text-xs font-bold text-slate-300">카메라가 뾰로롱 켜지고 있어요. 조금만 기다려주세요! 📸</p>
              </div>
            )}

            {/* Task Passed Adorable Overlay */}
            {gameState === "passed" && (
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/90 to-purple-600/90 flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
                <div className="bg-yellow-300 text-slate-800 p-4 rounded-full shadow-lg animate-bounce text-4xl">
                  ⭐
                </div>
                <h3 className="text-2xl font-black text-yellow-300 font-display">🎉 미션 참 잘했어요! 🎉</h3>
                <p className="text-xs sm:text-sm max-w-md text-pink-100 font-bold leading-relaxed">
                  {gameMode === "line"
                    ? "에스컬레이터 노란 번개선 안쪽에 이쁘게 나란히 서 있는 멋진 수칙을 해냈어요!"
                    : "위험하지 않게 움직이는 칼라풀 손잡이를 꼭 잡고 무사히 도착했답니다!"}
                </p>
                <div className="bg-white/20 px-4 py-2 rounded-2xl text-xs text-yellow-200 border-2 border-white/20 font-black">
                  👑 황금 별 안전 스탬프 발급 완료!
                </div>
              </div>
            )}

            {/* Task Failed Adorable Overlay */}
            {gameState === "failed" && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
                <div className="text-5xl animate-bounce">😢</div>
                <h3 className="text-xl font-black text-pink-400 font-display">조금만 더 조심조심!</h3>
                <p className="text-xs sm:text-sm max-w-md text-slate-300 font-bold leading-relaxed">
                  {gameMode === "line"
                    ? "노란 번개선을 밟으면 신발이나 바지가 기차 틈새에 끼어 크게 아야 할 수 있어요."
                    : "손잡이를 잡지 않으면 기차가 갑자기 멈출 때 슈웅 뒤로 밀릴 수 있어요."}
                </p>
                <button
                  onClick={startGame}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black px-6 py-2.5 rounded-2xl text-xs transition shadow-md border-2 border-yellow-300 active:scale-95"
                >
                  다시 조심히 타기 🎠
                </button>
              </div>
            )}
          </div>

          {/* Camera Toggle and Simulator Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border-2 border-pink-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseWebcam(!useWebcam)}
                className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-1.5 shadow-sm border-2 ${
                  useWebcam
                    ? "bg-rose-500 text-white border-rose-400"
                    : "bg-white hover:bg-rose-50 text-slate-700 border-slate-200"
                }`}
              >
                <Camera className="w-4 h-4" />
                {useWebcam ? "카메라 꺼두기" : "내 얼굴 실시간 카메라 켜기"}
              </button>

              <span className="text-xs text-slate-500 font-black">
                {useWebcam ? "🔴 카메라 작동 중!" : "🤖 연습 인형 조종하기"}
              </span>
            </div>

            {/* Start Game Controls */}
            {gameState === "ready" && (
              <button
                onClick={startGame}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 hover:from-emerald-300 hover:to-teal-300 border-2 border-emerald-300 font-black px-6 py-2.5 rounded-2xl text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1"
              >
                🎮 훈련 시작하기!
              </button>
            )}

            {gameState === "playing" && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {gameMode === "line" ? (
                  <div className="bg-pink-100 text-pink-700 border-2 border-pink-200 font-black px-4 py-2 rounded-2xl text-xs animate-bounce-slow">
                    ⏱️ 성공까지: {countdown}초 남음!
                  </div>
                ) : (
                  <div className="w-36 bg-slate-100 h-5 rounded-full overflow-hidden relative border-2 border-slate-200">
                    <div
                      className="bg-gradient-to-r from-pink-400 to-rose-400 h-full transition-all duration-300"
                      style={{ width: `${gripProgress}%` }}
                    />
                    <span className="absolute inset-0 text-[10px] text-center text-slate-900 font-black flex items-center justify-center">
                      손잡이 꽉 잡은 힘: {Math.round(gripProgress)}%
                    </span>
                  </div>
                )}

                <button
                  onClick={resetGame}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-4 py-2 rounded-2xl text-xs transition active:scale-95 border border-slate-200"
                >
                  그만하기
                </button>
              </div>
            )}

            {(gameState === "passed" || gameState === "failed") && (
              <button
                onClick={resetGame}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-2xl text-xs transition border border-slate-200 active:scale-95"
              >
                다시 준비방 가기
              </button>
            )}
          </div>
        </div>

        {/* Right Info, Tutorial Guidelines & Character Simulator Control */}
        <div className="space-y-6">
          
          {/* Adorable Mission Guidelines */}
          <div className="bg-white rounded-3xl p-6 border-4 border-pink-100/60 shadow-sm space-y-4 text-left">
            <h3 className="font-black text-slate-800 text-lg font-display flex items-center gap-1.5">
              <span>💡</span> 미션 약속 가이드
            </h3>
            
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed bg-pink-50/50 p-4 rounded-2xl border-2 border-pink-100">
              <p className="font-black text-pink-700 text-xs">
                {gameMode === "line"
                  ? "[1단계 미션] 디딤판 노란 안전선 안쪽에 바르게 서기"
                  : "[2단계 미션] 움직이는 핸드레일 손잡이 꽉 잡고 가기"}
              </p>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                {gameMode === "line"
                  ? "에스컬레이터 노란 번개선 바깥에 두 발을 이쁘게 모으고 10초 동안 똑바로 서 있어보세요! 움직이지 않고 버텨야 통과됩니다."
                  : "에스컬레이터 오른쪽에 있는 손잡이 부분에 손을 딱 대고 게이지를 100%까지 가득 채워보세요!"}
              </p>
            </div>

            {/* Interactive Simulator Pad (Only displayed when webcam is off) */}
            {!useWebcam && (
              <div className="bg-pink-50/40 rounded-2xl p-4 border-2 border-pink-100 space-y-3">
                <div className="text-[11px] font-black text-pink-600 uppercase tracking-widest flex items-center gap-1">
                  <span>🧸</span> 연습 인형 조종하기
                </div>
                <div className="text-slate-600 text-xs font-bold leading-relaxed space-y-2">
                  <p>
                    {gameMode === "line"
                      ? "💡 왼쪽 화면의 연습인형 캐릭터를 누르고 좌우로 드래그해서 움직여보세요! 초록색 안전구역에 세워두면 성공해요!"
                      : "💡 왼쪽 화면의 연습인형 캐릭터를 누르고 오른쪽 파란/핑크 고무 손잡이 부근으로 데려가면 손잡이를 꼭 잡을 수 있어요!"}
                  </p>
                  <div className="bg-white/80 rounded-xl p-2.5 text-[11px] text-center text-pink-600 border border-pink-200">
                    현재 상태: {gameMode === "line" 
                      ? (simFeetInCorrectArea ? "💚 안전 구역 안쪽" : "❤️ 노란 번개선 밟음! (위험)")
                      : (simHoldingHandrail ? "💚 손잡이 꼭 잡음!" : "❤️ 손놓음! (위험)")}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Informational Tip */}
          <div className="bg-sky-50 border-2 border-sky-100 rounded-[2rem] p-6 text-sky-900 space-y-2 text-left">
            <h4 className="font-black text-sky-950 text-xs sm:text-sm flex items-center gap-1">
              <span>🩺</span> 왜 조심해야 할까요?
            </h4>
            <p className="text-[11px] leading-relaxed font-bold text-sky-900">
              우리 꼬마 대원들이 자주 신는 예쁜 고무 신발(크록스 등)은 몰랑몰랑해서 노란선 구석에 가깝게 대면 끼임 사고가 발생하기 정말 쉬워요. 기차가 갑자기 멈출 때 손잡이를 꼬옥 붙잡고 있어야 머리를 다치지 않는답니다! 💖
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
