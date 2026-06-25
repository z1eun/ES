import React, { useRef, useState, useEffect } from "react";
import { Stamp, SafetyTaskType } from "../types";
import { SAFETY_TASKS } from "../data/tasks";
import { Camera, AlertCircle, RefreshCw, CheckCircle2, Play, BellRing, PhoneCall } from "lucide-react";

interface ElevatorGameProps {
  onAddStamp: (taskId: SafetyTaskType, score: number) => void;
  stamps: Stamp[];
}

export default function ElevatorGame({ onAddStamp, stamps }: ElevatorGameProps) {
  const [gameMode, setGameMode] = useState<"door" | "bell">("door");
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [webcamStatus, setWebcamStatus] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [gameState, setGameState] = useState<"ready" | "playing" | "failed" | "passed">("ready");

  // Game specific variables
  const [doorProgress, setDoorProgress] = useState<number>(0); // 0 to 100
  const [bellStep, setBellStep] = useState<"none" | "alarm" | "ringing" | "connected" | "rescued">("none");
  const [gameMessage, setGameMessage] = useState<string>("초록색 버튼을 눌러서 재밌는 엘리베이터 놀이를 시작해요! 💛");
  const [warningActive, setWarningActive] = useState<boolean>(false);

  // 3-second pre-game timer
  const [startTimer, setStartTimer] = useState<number | null>(null);

  // 5-second emergency bell hold trackers
  const [bellHoldProgress, setBellHoldProgress] = useState<number>(0);
  const [isPressingSimBell, setIsPressingSimBell] = useState<boolean>(false);
  const isPressingSimBellRef = useRef<boolean>(false);

  // Character Simulator states and dynamic coordinates
  const [charPos, setCharPos] = useState({ x: 320, y: 370 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);

  const [simLeaningOnDoor, setSimLeaningOnDoor] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameData = useRef<ImageData | null>(null);

  // Sound synthesis with sweet high tones for toddlers
  const playSound = (type: "beep" | "success" | "fail" | "bell" | "alarm" | "door_close" | "happy") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === "beep") {
        // High alarm bubble sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.setValueAtTime(450, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === "success") {
        // Happy kids success chime
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.25);
        });
      } else if (type === "fail") {
        // Soft sad "boing"
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(260, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "bell") {
        // Cartoon bell sound
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "alarm") {
        // Soft warning siren (not scary)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.2);
        osc.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === "door_close") {
        // Elevator whistle
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(350, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(450, ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else if (type === "happy") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      console.warn("Audio Context failure:", e);
    }
  };

  // Webcam stream capture toggler
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
          console.error("Webcam failed:", err);
          setWebcamStatus("error");
          setUseWebcam(false);
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

  // 3-second pre-game countdown before training starts
  useEffect(() => {
    if (startTimer === null) return;
    if (startTimer === 0) {
      setStartTimer(null);
      setGameState("playing");
      setDoorProgress(0);
      setBellHoldProgress(0);
      setWarningActive(false);
      if (gameMode === "door") {
        playSound("door_close");
        setGameMessage("방송 안내: '문이 스르륵 닫힙니다! 노란선 뒤로 얌전히 물러나 서주세요! 🚪'");
      } else {
        setBellStep("alarm");
        playSound("beep");
        setGameMessage("어라라! 정전이 되어 불이 꺼졌어요! 🥺 당황하지 말고 옆에 있는 커다란 빨간 비상벨을 꾸욱 5초간 눌러요!");
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

  // Door closed incremental loop & 5-second Emergency button holder loop
  useEffect(() => {
    let interval: any = null;
    if (gameState === "playing") {
      if (gameMode === "door") {
        setWarningActive(false);
        interval = setInterval(() => {
          const isObstruction = useWebcam ? warningActive : simLeaningOnDoor;

          if (isObstruction) {
            playSound("beep");
            setDoorProgress(0);
            setGameState("failed");
            setGameMessage("삐비빅! 🛑 문 근처에서 손이나 몸의 움직임이 느껴져서 문이 다시 열렸어요! 안전선 뒤쪽으로 꼬옥 물러서서 가만히 서 있어주세요.");
            clearInterval(interval);
          } else {
            setDoorProgress((prev) => {
              if (prev >= 100) {
                clearInterval(interval);
                setGameState("passed");
                onAddStamp("elevator_door", 100);
                playSound("success");
                setGameMessage("우와! 문이 완전히 닫힐 때까지 이쁘게 뒤쪽에 가만히 서 계셨네요! 정말 씩씩하고 대견해요. 스탬프를 드려요! 💖");
                return 100;
              }
              return prev + 5; // 5% per tick, total of ~6 seconds
            });
          }
        }, 300);
      } else if (gameMode === "bell") {
        // Continuous 5-second bell checker (runs every 200ms)
        interval = setInterval(() => {
          // In alarm phase, verify if they are pressing (either through webcam motion or sim key state)
          if (bellStep === "alarm") {
            const isHolding = useWebcam ? warningActive : isPressingSimBellRef.current;

            if (isHolding) {
              setBellHoldProgress((p) => {
                const next = Math.min(100, p + 4); // +4% every 200ms reaches 100% in exactly 5 seconds!
                if (next >= 100) {
                  clearInterval(interval);
                  triggerEmergencyBell();
                }
                return next;
              });
              setGameMessage(`🚨 비상벨을 꼬욱 누르고 있어요! 구조대에 신호를 보내는 중... (누른 시간: ${Math.round((bellHoldProgress / 100) * 5)}초 / 5초)`);
              if (Math.round(bellHoldProgress) % 12 === 0) {
                playSound("beep");
              }
            } else {
              setBellHoldProgress((p) => Math.max(0, p - 6)); // decay progress if they let go
              setGameMessage("어라라! 손을 떼면 안 돼요! 빨간 비상벨 버튼을 5초 동안 꾸우욱 누르고 계세요! ✊");
            }
          } else if (bellStep === "alarm") {
            // siren alarm sound
            playSound("alarm");
          }
        }, 200);
      }
    }
    return () => clearInterval(interval);
  }, [gameState, gameMode, bellStep, useWebcam, warningActive, simLeaningOnDoor, bellHoldProgress]);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (useWebcam && webcamStatus === "active" && video) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        const w = canvas.width;
        const h = canvas.height;

        // Perform real-time motion detection for staying behind the boundary line
        if (gameState === "playing" && gameMode === "door") {
          // Detection region below/in-front-of the safety line (closer to the doors/camera)
          const frontRegion = { x: 50, y: h - 130, w: w - 100, h: 90 };
          const currentFront = ctx.getImageData(frontRegion.x, frontRegion.y, frontRegion.w, frontRegion.h);
          
          let motionPixels = 0;
          if (prevFrameData.current) {
            const step = 4;
            for (let cy = 0; cy < frontRegion.h; cy += step) {
              for (let cx = 0; cx < frontRegion.w; cx += step) {
                const ax = frontRegion.x + cx;
                const ay = frontRegion.y + cy;
                const fullIndex = (ay * w + ax) * 4;
                const cropIndex = (cy * frontRegion.w + cx) * 4;
                const diff = Math.abs(currentFront.data[cropIndex] - (prevFrameData.current?.data[fullIndex] || 0));
                if (diff > 45) motionPixels++;
              }
            }
            const ratio = motionPixels / ((frontRegion.w * frontRegion.h) / (step * step));
            if (ratio > 0.15) {
              setWarningActive(true); // Stepped forward / crossing the line
            } else {
              setWarningActive(false);
            }
          }
          prevFrameData.current = ctx.getImageData(0, 0, w, h);
        }

        // Perform hands motion detection over virtual bell button in Trapped Mode
        if (gameState === "playing" && gameMode === "bell" && bellStep === "alarm") {
          const bellRegion = { x: Math.floor(w / 2 - 70), y: Math.floor(h / 2 - 70), w: 140, h: 140 };
          const currentBell = ctx.getImageData(bellRegion.x, bellRegion.y, bellRegion.w, bellRegion.h);
          
          let bellMotion = 0;
          if (prevFrameData.current) {
            const step = 4;
            for (let cy = 0; cy < bellRegion.h; cy += step) {
              for (let cx = 0; cx < bellRegion.w; cx += step) {
                const ax = bellRegion.x + cx;
                const ay = bellRegion.y + cy;
                const fullIndex = (ay * w + ax) * 4;
                const cropIndex = (cy * bellRegion.w + cx) * 4;
                const diff = Math.abs(currentBell.data[cropIndex] - (prevFrameData.current?.data[fullIndex] || 0));
                if (diff > 50) bellMotion++;
              }
            }
            const ratio = bellMotion / ((bellRegion.w * bellRegion.h) / (step * step));
            if (ratio > 0.15) {
              setWarningActive(true); // Hand is on the bell!
            } else {
              setWarningActive(false);
            }
          }
          prevFrameData.current = ctx.getImageData(0, 0, w, h);
        }

        drawWebcamHUD(ctx, w, h);
      } else {
        drawElevatorSimulation(ctx, canvas.width, canvas.height);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [useWebcam, webcamStatus, gameMode, gameState, doorProgress, bellStep, simLeaningOnDoor, warningActive]);

  const drawWebcamHUD = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (gameMode === "door") {
      const doorWidth = (w / 2) * (doorProgress / 100);

      // Left Sliding Door - Pastel sweet strawberry cream color!
      ctx.fillStyle = "rgba(251, 207, 232, 0.85)"; 
      ctx.fillRect(0, 0, doorWidth, h);
      ctx.strokeStyle = "#db2777";
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, doorWidth, h);

      // Right Sliding Door - Pastel sweet strawberry cream color!
      ctx.fillStyle = "rgba(251, 207, 232, 0.85)";
      ctx.fillRect(w - doorWidth, 0, doorWidth, h);
      ctx.strokeRect(w - doorWidth, 0, doorWidth, h);

      if (doorProgress > 0 && doorProgress < 100) {
        ctx.strokeStyle = warningActive ? "#ec4899" : "#10b981";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(doorWidth, 0);
        ctx.lineTo(doorWidth, h);
        ctx.moveTo(w - doorWidth, 0);
        ctx.lineTo(w - doorWidth, h);
        ctx.stroke();
      }

      // Safe Standing zone guidelines (Floor Line) - Beautiful structured boundary
      if (doorProgress < 100 && gameState === "playing") {
        const lineY = h - 130;
        
        // Draw the neon safety boundary line
        ctx.strokeStyle = warningActive ? "#ef4444" : "#fbbf24";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(20, lineY);
        ctx.lineTo(w - 20, lineY);
        ctx.stroke();

        // Safe region behind the line - green glowing tint
        ctx.fillStyle = "rgba(16, 185, 129, 0.12)";
        ctx.fillRect(20, 20, w - 40, lineY - 20);
        ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
        ctx.lineWidth = 3;
        ctx.strokeRect(20, 20, w - 40, lineY - 20);

        // Labels
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 3;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.strokeText("⭐ 안전 구역 (이 선의 뒤쪽에 이쁘게 서 있어주세요!) ⭐", w / 2, 45);
        ctx.fillText("⭐ 안전 구역 (이 선의 뒤쪽에 이쁘게 서 있어주세요!) ⭐", w / 2, 45);

        ctx.fillStyle = warningActive ? "#fca5a5" : "#fef08a";
        ctx.font = "bold 11px sans-serif";
        ctx.strokeText("⚠️ 문에 손을 대거나 기대면 삐익! 다시 열려요 ⚠️", w / 2, lineY - 12);
        ctx.fillText("⚠️ 문에 손을 대거나 기대면 삐익! 다시 열려요 ⚠️", w / 2, lineY - 12);
      }
    }

    if (gameMode === "bell" && gameState === "playing") {
      if (bellStep === "alarm") {
        const blink = Date.now() % 1000 < 500;
        
        // Draw hologram background card
        ctx.fillStyle = "rgba(15, 23, 42, 0.65)";
        ctx.beginPath();
        ctx.roundRect(w / 2 - 110, h / 2 - 110, 220, 220, 24);
        ctx.fill();
        ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
        ctx.lineWidth = 3;
        ctx.stroke();

        // 3D red button in center
        ctx.fillStyle = blink ? "#f43f5e" : "#e11d48";
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 55, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Charging radial ring showing hold progress (5 seconds)
        if (bellHoldProgress > 0) {
          ctx.strokeStyle = "#10b981";
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(w / 2, h / 2, 68, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (bellHoldProgress / 100)));
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("🚨 비상벨", w / 2, h / 2 - 12);
        
        ctx.font = "bold 11px sans-serif";
        ctx.fillStyle = "#ffe4e6";
        ctx.fillText("여기에 손을 대고", w / 2, h / 2 + 12);
        ctx.fillText("5초간 꾸욱 버티기!", w / 2, h / 2 + 28);
      }
    }
  };

  const drawElevatorSimulation = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (gameMode === "bell") {
      // Draw brushed metallic background
      ctx.fillStyle = "#cbd5e1"; // metallic silver
      ctx.fillRect(0, 0, w, h);
      
      // Draw modern border
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, w - 8, h - 8);

      // 1. Digital LED Status display at the top
      ctx.fillStyle = "#1e293b";
      ctx.beginPath();
      ctx.roundRect(w / 2 - 180, 20, 360, 60, 12);
      ctx.fill();
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Flashing text inside LED
      const blink = Date.now() % 1000 < 500;
      ctx.textAlign = "center";
      if (bellStep === "alarm") {
        ctx.fillStyle = blink ? "#ef4444" : "#f59e0b";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("🚨 정전 발생! 5초간 비상벨을 누르세요 🚨", w / 2, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("STATUS: POWER FAIL / OUT OF SERVICE", w / 2, 68);
      } else if (bellStep === "ringing") {
        ctx.fillStyle = "#60a5fa";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("☎️ 구조 신호 전송 중...", w / 2, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText(`TRANSMITTING EMERGENCY BEACON (${Math.round((bellHoldProgress/100)*5)}초)`, w / 2, 68);
      } else if (bellStep === "connected") {
        ctx.fillStyle = "#34d399";
        ctx.font = "bold 15px sans-serif";
        ctx.fillText("☎️ 상담 센터 연결 완료! 대기 중", w / 2, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("CONNECTED TO EMERGENCY DISPATCH", w / 2, 68);
      } else if (bellStep === "rescued") {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("🎉 구조 완료! 대피 통로 확보 🎉", w / 2, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#34d399";
        ctx.fillText("RESCUE MISSION SUCCESSFUL!", w / 2, 68);
      } else {
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 16px sans-serif";
        ctx.fillText("🎈 정상 운행 중 🎈", w / 2, 45);
        ctx.font = "11px monospace";
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("SYSTEM STATUS: OK", w / 2, 68);
      }

      // 2. Draw Floor Button grid
      const btnRadius = 24;
      const buttons = [
        { label: "5", x: w / 2 - 120, y: 130 },
        { label: "4", x: w / 2 - 40,  y: 130 },
        { label: "3", x: w / 2 + 40,  y: 130 },
        { label: "2", x: w / 2 + 120, y: 130 },
        { label: "1", x: w / 2 - 80,  y: 195 },
        { label: "◀▶", x: w / 2,     y: 195 },
        { label: "▶◀", x: w / 2 + 80,  y: 195 },
      ];

      buttons.forEach((btn) => {
        ctx.fillStyle = "#f1f5f9";
        ctx.beginPath();
        ctx.arc(btn.x, btn.y, btnRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#475569";
        ctx.font = "bold 13px sans-serif";
        ctx.fillText(btn.label, btn.x, btn.y + 5);
      });

      // 3. Draw GIANT glowing red emergency button in center bottom
      const bellX = w / 2;
      const bellY = h - 110;
      const bellR = 50;

      // Glowing pulse ring if trapped
      if (bellStep === "alarm") {
        const pulse = 10 + Math.sin(Date.now() / 150) * 8;
        ctx.fillStyle = "rgba(239, 68, 68, 0.2)";
        ctx.beginPath();
        ctx.arc(bellX, bellY, bellR + pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // Main Button body
      ctx.fillStyle = (bellStep === "alarm" && blink) ? "#ef4444" : "#dc2626";
      ctx.beginPath();
      ctx.arc(bellX, bellY, bellR, 0, Math.PI * 2);
      ctx.fill();
      
      // Button rim
      ctx.strokeStyle = "#ffe4e6";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Bevel edge
      ctx.strokeStyle = "#991b1b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(bellX, bellY, bellR - 5, 0, Math.PI * 2);
      ctx.stroke();

      // Progress charging ring around button (5 seconds)
      if (bellHoldProgress > 0) {
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(bellX, bellY, bellR + 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (bellHoldProgress / 100)));
        ctx.stroke();

        // Percent text
        ctx.fillStyle = "#10b981";
        ctx.font = "bold 14px sans-serif";
        ctx.strokeText(`꾸욱 누르는 중! ${Math.round(bellHoldProgress)}%`, bellX, bellY - 70);
        ctx.fillText(`꾸욱 누르는 중! ${Math.round(bellHoldProgress)}%`, bellX, bellY - 70);
      }

      // Bell label
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 14px sans-serif";
      ctx.fillText("🚨 비상벨", bellX, bellY - 6);
      ctx.font = "bold 10px sans-serif";
      ctx.fillStyle = "#fecdd3";
      ctx.fillText("EMERGENCY", bellX, bellY + 14);
      ctx.fillText("(5초간 누르기)", bellX, bellY + 26);
      
      return;
    }

    // 1. Draw Cute Cookie House Elevator Interior
    const isDarkAlarm = bellStep === "alarm" && Date.now() % 800 < 400;
    ctx.fillStyle = isDarkAlarm ? "#4c1d95" : "#fef2f2"; // soft warm purple vs pale sweet pink
    ctx.fillRect(0, 0, w, h);

    // Warm light frame
    ctx.strokeStyle = isDarkAlarm ? "#6d28d9" : "#fbcfe8";
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    // If electricity goes down, draw very cute warm floating helper cartoon ghosts/stars!
    if (bellStep === "alarm") {
      ctx.fillStyle = "#fef08a";
      ctx.font = "18px sans-serif";
      ctx.fillText("⭐ 어두워도 괜찮아요! 걱정마세요 ⭐", w / 2, 85);
      
      // Floating friendly star buddies
      const pulseStar = 10 + Math.sin(Date.now() / 200) * 4;
      ctx.fillStyle = "rgba(253, 224, 71, 0.8)";
      ctx.beginPath();
      ctx.arc(60, 100, pulseStar, 0, Math.PI * 2);
      ctx.arc(w - 60, 100, pulseStar, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("안심별", 60, 120);
      ctx.fillText("안심별", w - 60, 120);
    } else {
      // 2. Draw Cute Floor Display and indicators
      ctx.fillStyle = "#f472b6"; // bright pink display
      ctx.beginPath();
      ctx.roundRect(w / 2 - 45, 30, 90, 32, 8);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("🎈 5F 🎈", w / 2, 51);
    }

    // 3. Draw Safety Kid Character inside elevator with cute bunny hat
    const charX = charPos.x;
    const charY = charPos.y;

    // Bunny ears
    ctx.fillStyle = "#fbcfe8";
    ctx.strokeStyle = "#db2777";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(charX - 10, charY - 60, 6, 16, -Math.PI / 12, 0, Math.PI * 2);
    ctx.ellipse(charX + 10, charY - 60, 6, 16, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner ear
    ctx.fillStyle = "#f472b6";
    ctx.beginPath();
    ctx.ellipse(charX - 10, charY - 60, 3, 10, -Math.PI / 12, 0, Math.PI * 2);
    ctx.ellipse(charX + 10, charY - 60, 3, 10, Math.PI / 12, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.beginPath();
    ctx.arc(charX, charY - 40, 22, 0, Math.PI * 2);
    ctx.fillStyle = "#ffe4e6"; // sweet skin
    ctx.fill();
    ctx.stroke();

    // Blushing cheeks
    ctx.fillStyle = "rgba(244, 114, 182, 0.4)";
    ctx.beginPath();
    ctx.arc(charX - 10, charY - 34, 4, 0, Math.PI * 2);
    ctx.arc(charX + 10, charY - 34, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes & Smile
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(charX - 8, charY - 43, 2.5, 0, Math.PI * 2);
    ctx.arc(charX + 8, charY - 43, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    if (simLeaningOnDoor || bellStep === "alarm") {
      ctx.arc(charX, charY - 30, 5, Math.PI, 0); // sad face
    } else {
      ctx.arc(charX, charY - 32, 6, 0, Math.PI); // smiling face
    }
    ctx.stroke();

    // Body/Coat - cute lemon vest
    ctx.fillStyle = "#fef08a";
    ctx.beginPath();
    ctx.roundRect(charX - 18, charY - 15, 36, 48, 10);
    ctx.fill();
    ctx.stroke();

    // Heart stamp on vest
    ctx.fillStyle = "#ec4899";
    ctx.font = "10px sans-serif";
    ctx.fillText("❤️", charX, charY + 8);

    // Hands
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3.5;
    // Left Arm
    ctx.beginPath();
    ctx.moveTo(charX - 18, charY - 10);
    ctx.lineTo(charX - 32, charY + 12);
    ctx.stroke();

    // Right Arm (Controls pressing bell)
    ctx.beginPath();
    ctx.moveTo(charX + 18, charY - 10);
    if (gameMode === "bell" && bellStep === "ringing") {
      ctx.lineTo(charX + 45, charY - 18); // pressing bell
    } else {
      ctx.lineTo(charX + 32, charY + 12);
    }
    ctx.stroke();

    // Legs & Cute pink boots
    ctx.beginPath();
    ctx.moveTo(charX - 8, charY + 33);
    ctx.lineTo(charX - 8, charY + 62);
    ctx.moveTo(charX + 8, charY + 33);
    ctx.lineTo(charX + 8, charY + 62);
    ctx.stroke();

    ctx.fillStyle = "#ec4899";
    ctx.beginPath();
    ctx.roundRect(charX - 15, charY + 62, 13, 7, 3);
    ctx.roundRect(charX + 2, charY + 62, 13, 7, 3);
    ctx.fill();
    ctx.stroke();

    // 4. Draw Interactive Candy Panel on the right (Contains red emergency bell button)
    const px = w - 75;
    const py = h / 2 - 60;
    ctx.fillStyle = "#fbcfe8"; // sweet pastel pink plate
    ctx.fillRect(px, py, 45, 100);
    ctx.strokeStyle = "#db2777";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(px, py, 45, 100);

    // Bell Button inside panel
    const blinkBtn = bellStep === "alarm" && Date.now() % 500 < 250;
    ctx.fillStyle = blinkBtn ? "#ef4444" : "#ec4899";
    ctx.beginPath();
    ctx.arc(px + 22, py + 40, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#9d174d";
    ctx.font = "bold 9px sans-serif";
    ctx.fillText("비상벨", px + 22, py + 22);

    // 5. Draw sliding doors in front (if in Door mode)
    if (gameMode === "door") {
      const doorWidth = (w / 2) * (doorProgress / 100);
      
      // Sweet pastel lilac door color
      ctx.fillStyle = "rgba(233, 213, 255, 0.95)"; 
      ctx.fillRect(0, 0, doorWidth, h);
      ctx.fillRect(w - doorWidth, 0, doorWidth, h);

      ctx.strokeStyle = "#a855f7";
      ctx.lineWidth = 3;
      ctx.strokeRect(0, 0, doorWidth, h);
      ctx.strokeRect(w - doorWidth, 0, doorWidth, h);

      // Gold vertical handles
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(doorWidth - 10, h / 2 - 40, 8, 80);
      ctx.fillRect(w - doorWidth + 2, h / 2 - 40, 8, 80);
    }
  };

  const handleCanvasPointerDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    // Calculate coordinates inside 640x480 canvas space
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    if (gameMode === "bell") {
      if (bellStep === "alarm") {
        // Giant Emergency button center: x = 320, y = 370 (h - 110), radius = 50.
        const dist = Math.sqrt((canvasX - 320) ** 2 + (canvasY - 370) ** 2);
        if (dist <= 50) {
          isPressingSimBellRef.current = true;
          setIsPressingSimBell(true);
        }
      }
    } else {
      // Draggable character check!
      const dist = Math.sqrt((canvasX - charPos.x) ** 2 + (canvasY - charPos.y) ** 2);
      if (dist < 45) {
        isDraggingRef.current = true;
        setIsDragging(true);
      }
    }
  };

  const handleCanvasPointerMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const canvasX = ((clientX - rect.left) / rect.width) * canvas.width;
    const canvasY = ((clientY - rect.top) / rect.height) * canvas.height;

    if (gameMode === "bell") {
      if (isPressingSimBellRef.current) {
        // Keep pressing if finger or cursor stays within comfortable range
        const dist = Math.sqrt((canvasX - 320) ** 2 + (canvasY - 370) ** 2);
        if (dist > 85) {
          isPressingSimBellRef.current = false;
          setIsPressingSimBell(false);
        }
      }
    } else {
      if (isDraggingRef.current) {
        // Constrain dragging bounds
        const newX = Math.max(40, Math.min(canvas.width - 40, canvasX));
        const newY = Math.max(180, Math.min(canvas.height - 110, canvasY));
        setCharPos({ x: newX, y: newY });

        // If character goes below y = 350 (stepping forward too close to doors/front area), trigger warning!
        if (newY > 350) {
          setSimLeaningOnDoor(true);
          setWarningActive(true);
        } else {
          setSimLeaningOnDoor(false);
          setWarningActive(false);
        }
      }
    }
  };

  const handleCanvasPointerUp = () => {
    isDraggingRef.current = false;
    setIsDragging(false);

    isPressingSimBellRef.current = false;
    setIsPressingSimBell(false);
  };

  const startTraining = () => {
    playSound("happy");
    setDoorProgress(0);
    setBellHoldProgress(0);
    setWarningActive(false);
    setStartTimer(3); // Start 3-second pre-game timer
    setGameState("ready");
    setGameMessage("⏰ 3초 타이머 시작! 바르게 대기하고 계세요!");
  };

  const resetTraining = () => {
    setGameState("ready");
    setStartTimer(null);
    setDoorProgress(0);
    setBellHoldProgress(0);
    setBellStep("none");
    setWarningActive(false);
    setSimLeaningOnDoor(false);
    setCharPos({ x: 320, y: 370 });
    setGameMessage("초록색 버튼을 눌러서 재밌는 엘리베이터 놀이를 시작해요! 💛");
  };

  // Triggered when Emergency button is clicked or waved over
  const triggerEmergencyBell = () => {
    if (bellStep !== "alarm") return;
    
    playSound("bell");
    setBellStep("ringing");
    setGameMessage("따르릉~ ☎️ 비상벨 신호가 씩씩하게 종합 상황 센터로 날아가고 있어요!");

    setTimeout(() => {
      setBellStep("connected");
      setGameMessage("☎️ 구조대원 삼촌: '안녕! 씩씩한 꼬마 대원님! 걱정 마세요, 비상 전화 연결 성공! 주소를 잘 받았으니 문 뒤에 이쁘게 서 계시면 119 삼촌들이 금방 구하러 갈게요!'");
      playSound("success");

      setTimeout(() => {
        setBellStep("rescued");
        setGameState("passed");
        onAddStamp("elevator_bell", 100);
        setGameMessage("영웅 구출! 🚒 삼촌들이 문을 활짝 열어주었어요! 씩씩하게 비상 대처 완료! 참 잘했어요 스탬프를 드려요!");
      }, 7000);
    }, 2500);
  };

  return (
    <div className="space-y-6" id="elevator-game">
      
      {/* Category Header with child-friendly card style */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-rose-50 to-pink-50 p-6 rounded-[2rem] border-4 border-rose-200/60 shadow-sm text-left">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 bg-rose-200 text-rose-900 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider animate-bounce-slow">
            🎈 엘리베이터 안전 모험 🚌
          </span>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display">
            문틈 주의와 삐뽀 비상벨!
          </h2>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            문이 닫힐 때 얌전히 서 있고, 어두워도 당황하지 않고 비상벨을 누르는 영웅 대원이 되어보세요! 🧸
          </p>
        </div>

        {/* Tab switch with highly friendly colors */}
        <div className="flex bg-rose-100/50 p-1.5 rounded-2xl border-2 border-rose-200 self-start md:self-auto shadow-inner">
          <button
            onClick={() => {
              setGameMode("door");
              resetTraining();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === "door"
                ? "bg-rose-400 text-white shadow border border-rose-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🚪 1단계: 문틈 주의하기
          </button>
          <button
            onClick={() => {
              setGameMode("bell");
              resetTraining();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              gameMode === "bell"
                ? "bg-teal-400 text-slate-900 shadow border border-teal-300"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🔔 2단계: 비상벨 누르기
          </button>
        </div>
      </div>

      {/* Main Sandbox Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Interactive Play Canvas Container */}
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
              onMouseDown={handleCanvasPointerDown}
              onMouseMove={handleCanvasPointerMove}
              onMouseUp={handleCanvasPointerUp}
              onMouseLeave={handleCanvasPointerUp}
              onTouchStart={handleCanvasPointerDown}
              onTouchMove={handleCanvasPointerMove}
              onTouchEnd={handleCanvasPointerUp}
              onTouchCancel={handleCanvasPointerUp}
            />

            {/* 3-Second countdown countdown */}
            {startTimer !== null && (
              <div className="absolute inset-0 bg-rose-500/85 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20">
                <div className="text-8xl font-black animate-ping text-yellow-300 font-display">
                  {startTimer}
                </div>
                <p className="text-sm font-black text-white mt-8 tracking-wider">
                  ⚠️ 엘리베이터 훈련 준비 중! 움직이지 말고 서 계세요 ⚠️
                </p>
              </div>
            )}

            {/* Glowing cartoon warnings */}
            {(warningActive || bellStep === "alarm") && gameState === "playing" && (
              <div className="absolute inset-0 bg-rose-500/20 border-[12px] border-rose-500 animate-pulse pointer-events-none flex items-center justify-center">
                <div className="bg-rose-600 border-2 border-white text-white px-5 py-3 rounded-2xl flex items-center gap-1.5 shadow-xl animate-bounce">
                  <span className="text-xl">⚠️</span>
                  <span className="font-black text-xs sm:text-sm">
                    {gameMode === "door" ? "조심해요! 안전선 가까이에 서 있어요!" : "🚨 삐뽀삐뽀! 비상벨을 5초간 꾹 눌러요!"}
                  </span>
                </div>
              </div>
            )}

            {/* Webcam Requesting Overlay */}
            {useWebcam && webcamStatus === "requesting" && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin text-rose-400" />
                <p className="text-xs font-bold text-slate-300">카메라를 열어 놀이방을 꾸미고 있어요... 📸</p>
              </div>
            )}

            {/* Task Completed Adorable Overlay */}
            {gameState === "passed" && (
              <div className="absolute inset-0 bg-gradient-to-b from-teal-500/90 to-emerald-600/90 flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
                <div className="bg-yellow-300 text-slate-800 p-4 rounded-full shadow-lg animate-bounce text-4xl">
                  🏆
                </div>
                <h3 className="text-2xl font-black text-yellow-300 font-display">🎉 완벽하게 참 잘했어요! 🎉</h3>
                <p className="text-xs sm:text-sm max-w-md text-teal-100 font-bold leading-relaxed">
                  {gameMode === "door"
                    ? "스르륵 닫히는 문 옆에 손을 대지 않고 의젓하게 기다리는 약속을 지켰어요!"
                    : "엘리베이터가 고장 나도 울지 않고 비상벨을 눌러 무사히 구출되었어요! 최고의 어린이 영웅 대원!"}
                </p>
                <div className="bg-white/20 px-4 py-2 rounded-2xl text-xs text-yellow-200 border-2 border-white/20 font-black">
                  👑 황금 왕관 안전 스탬프 발송!
                </div>
              </div>
            )}

            {/* Task Failed Adorable Overlay */}
            {gameState === "failed" && (
              <div className="absolute inset-0 bg-slate-900/95 flex flex-col items-center justify-center text-white p-6 text-center space-y-4">
                <div className="text-5xl animate-bounce">🚪</div>
                <h3 className="text-xl font-black text-rose-400 font-display">스르륵! 문이 다시 열렸어요</h3>
                <p className="text-xs sm:text-sm max-w-md text-slate-300 font-bold leading-relaxed">
                  엘리베이터 문이나 틈새 주변에 가까이 있으면 손가락이나 얇은 옷자락이 끼어 아플 수 있답니다. 문에서 한 걸음 떨어져 볼까요?
                </p>
                <button
                  onClick={startTraining}
                  className="bg-yellow-400 hover:bg-yellow-300 text-slate-900 font-black px-6 py-2.5 rounded-2xl text-xs transition shadow-md border-2 border-yellow-300 active:scale-95"
                >
                  다시 조심히 타기 🎠
                </button>
              </div>
            )}

            {/* Floating Live Dialog for Trapped Scenario */}
            {gameMode === "bell" && gameState === "playing" && bellStep !== "alarm" && (
              <div className="absolute bottom-6 left-6 right-6 bg-slate-950/95 border-2 border-rose-400/50 rounded-2xl p-4 flex gap-3 text-white shadow-2xl items-center text-left">
                <div className="bg-rose-500 p-2.5 rounded-full animate-bounce-slow flex-shrink-0">
                  {bellStep === "ringing" ? (
                    <BellRing className="w-5 h-5 text-yellow-200" />
                  ) : (
                    <PhoneCall className="w-5 h-5 text-white" />
                  )}
                </div>
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-black text-pink-400 tracking-wider">
                    {bellStep === "ringing" ? "삐보삐보 신호 발송 중..." : "☎️ 119 구조 센터와 소통 중"}
                  </div>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed">
                    {bellStep === "ringing" && "비상 버튼을 꾸욱 눌러서 무전기를 켰어요! 대기 중이에요."}
                    {bellStep === "connected" && "구조대 삼촌: '꼬마 대원님! 걱정 마세요, 무전기 통신 성공! 얌전히 서 계시면 119 소방관 삼촌들이 번개처럼 출동해서 문을 열어줄게요!'"}
                    {bellStep === "rescued" && "소방관 삼촌: '철컥! 안전하게 개방 완료! 다친 곳은 없죠? 너무 씩씩하게 대처해서 멋져요!'"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Action trigger panel */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border-2 border-rose-100">
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
                {useWebcam ? "🔴 실시간 움직임 센서 작동!" : "🤖 연습 인형 조종하기"}
              </span>
            </div>

            {/* Training Action triggers */}
            {gameState === "ready" && (
              <button
                onClick={startTraining}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-900 hover:from-emerald-300 hover:to-teal-300 border-2 border-emerald-300 font-black px-6 py-2.5 rounded-2xl text-xs shadow-md transition active:scale-95 flex items-center justify-center gap-1"
              >
                🎮 훈련 시작하기!
              </button>
            )}

            {gameState === "playing" && (
              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {gameMode === "door" ? (
                  <div className="bg-rose-100 text-rose-700 border-2 border-rose-200 font-black px-4 py-2 rounded-2xl text-xs">
                    🚪 문 닫힘 진행: {doorProgress}%
                  </div>
                ) : (
                  bellStep === "alarm" && (
                    <button
                      onClick={triggerEmergencyBell}
                      className="bg-rose-500 hover:bg-rose-400 text-white font-black px-6 py-2 rounded-2xl text-xs transition active:scale-95 animate-bounce shadow-md flex items-center gap-1"
                    >
                      <BellRing className="w-4 h-4" />
                      비상벨 직접 터치!
                    </button>
                  )
                )}

                <button
                  onClick={resetTraining}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-black px-4 py-2 rounded-2xl text-xs transition active:scale-95 border border-slate-200"
                >
                  그만하기
                </button>
              </div>
            )}

            {(gameState === "passed" || gameState === "failed") && (
              <button
                onClick={resetTraining}
                className="w-full sm:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-5 py-2.5 rounded-2xl text-xs transition border border-slate-200 active:scale-95"
              >
                다시 준비방 가기
              </button>
            )}
          </div>
        </div>

        {/* Right Info Guidelines */}
        <div className="space-y-6">
          
          {/* Detailed Instructions and controls */}
          <div className="bg-white rounded-3xl p-6 border-4 border-rose-100/60 shadow-sm space-y-4 text-left">
            <h3 className="font-black text-slate-800 text-lg font-display flex items-center gap-1.5">
              <span>💡</span> 미션 약속 가이드
            </h3>
            
            <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed bg-rose-50/50 p-4 rounded-2xl border-2 border-rose-100">
              <p className="font-black text-rose-700 text-xs">
                {gameMode === "door"
                  ? "[1단계 미션] 문이 닫힐 때 손가락 넣지 않고 뒤에 서기"
                  : "[2단계 미션] 비상 정전 시 비상벨 누르고 안심하기"}
              </p>
              <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                {gameMode === "door"
                  ? "엘리베이터 문이 닫힐 때 중앙 센서 구역에서 멀리 뒤로 물러서서, 문이 다 닫힐 때까지 씩씩하게 얌전하게 기다려 보아요!"
                  : "갑자기 정전이 되어 어두워지면 무서워하지 마세요! 벽에 달린 비상벨을 꼭 누르고, 바닥에 차분하게 서서 기다리면 삼촌들이 금방 구하러 와요!"}
              </p>
            </div>

            {/* Virtual character controller instructions (only when webcam is disabled) */}
            {!useWebcam && (
              <div className="bg-rose-50/50 rounded-2xl p-4 border-2 border-rose-100 space-y-2">
                <div className="text-[11px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-1">
                  <span>🧸</span> 대화형 놀이 학습 가이드
                </div>
                <p className="text-xs text-slate-600 font-bold leading-relaxed">
                  {gameMode === "door" ? (
                    <span>
                      화면 속에 있는 귀여운 토끼 모자 캐릭터를 <strong>마우스나 손가락으로 꾹 잡아서 끌고 가보세요!</strong> 노란색 안전선 뒤로 얌전히 옮겨주면 성공할 수 있어요! 👣
                    </span>
                  ) : (
                    <span>
                      화면 한가운데에 나타난 <strong>빨간색 비상벨 버튼을 마우스나 손가락으로 5초 동안 꾸욱~</strong> 누르고 있어 보세요! 게이지가 꽉 차면서 구조 대원이 호출돼요! ✊
                    </span>
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Quick Educational Tip */}
          <div className="bg-sky-50 border-2 border-sky-100 rounded-[2rem] p-6 text-sky-900 space-y-2 text-left">
            <h4 className="font-black text-sky-950 text-xs sm:text-sm flex items-center gap-1">
              <span>🩺</span> 안전 선생님이 알려줘요!
            </h4>
            <p className="text-[11px] leading-relaxed font-bold text-sky-900">
              엘리베이터의 닫히는 문은 얇은 어린아이들의 장갑이나 옷자락, 손가락 틈새를 다 알아채지 못하고 닫힐 수 있어서 매우 위험해요! 또한 엘리베이터는 튼튼하게 공기가 통하도록 설계되어 있으니 갇혀도 겁먹지 말고 빨간 비상벨을 누르고 차분하게 구조 삼촌을 부르면 다치지 않고 구조될 수 있답니다! 💖
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
