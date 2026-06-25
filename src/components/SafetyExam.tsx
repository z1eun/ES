import React, { useRef, useState, useEffect } from "react";
import { Camera, ShieldCheck, Sparkles, Award, RefreshCw, Printer, FileCheck, RefreshCcw } from "lucide-react";
import { SafetyTaskType, SafetyCertificate } from "../types";

interface SafetyExamProps {
  userName: string;
  setUserName: (name: string) => void;
  stampsCount: number;
}

export default function SafetyExam({ userName, setUserName, stampsCount }: SafetyExamProps) {
  const [examTask, setExamTask] = useState<SafetyTaskType>("escalator_line");
  const [useWebcam, setUseWebcam] = useState<boolean>(true);
  const [webcamStatus, setWebcamStatus] = useState<"idle" | "requesting" | "active" | "error">("idle");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<{
    passed: boolean;
    score: number;
    feedback: string;
    simulated: boolean;
  } | null>(null);

  const [certificate, setCertificate] = useState<SafetyCertificate | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadingMessages = [
    "🤖 삐뽀 지킴이 로봇 삼촌이 사진을 보고 있어요...",
    "🔍 발밑에 노란색 선이 닿았는지 돋보기로 관찰 중이에요...",
    "✊ 손가락 끝이 손잡이를 꼭 잡았는지 확인하고 있어요...",
    "🚪 엘리베이터 문틈에서 이쁘게 물러섰는지 거리를 재고 있어요...",
    "✨ 꼬마 대원님의 씩씩하고 예쁜 마음에 하트 칭찬을 준비하고 있어요..."
  ];
  const [loadMsgIdx, setLoadMsgIdx] = useState<number>(0);

  // Rotate helpful loading messages
  useEffect(() => {
    let timer: any = null;
    if (analyzing) {
      timer = setInterval(() => {
        setLoadMsgIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadMsgIdx(0);
    }
    return () => clearInterval(timer);
  }, [analyzing]);

  // Turn on/off webcam
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
          console.error("Webcam blocked/unavailable:", err);
          setWebcamStatus("error");
          setUseWebcam(false);
        });
    } else {
      stopWebcam();
    }
    return () => stopWebcam();
  }, [useWebcam]);

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setWebcamStatus("idle");
  };

  // Continual local canvas frame update so the user sees a mirror preview
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId: number;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const video = videoRef.current;

      if (useWebcam && webcamStatus === "active" && video) {
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();

        drawExamGuidelines(ctx, canvas.width, canvas.height);
      } else {
        drawCartoonPosture(ctx, canvas.width, canvas.height);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [useWebcam, webcamStatus, examTask]);

  // Guidelines drew over webcam
  const drawExamGuidelines = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = "rgba(244, 114, 182, 0.6)"; // sweet pink guide frame
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(40, 40, w - 80, h - 80);
    ctx.setLineDash([]);

    // Grid center lines
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, w, 40);
    ctx.fillStyle = "#fef08a";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🧸 AI 꼬마 안전 카메라: ${getTaskName(examTask)} 포즈를 보여주세요!`, w / 2, 25);

    if (examTask === "escalator_line") {
      ctx.strokeStyle = "#fbbf24";
      ctx.lineWidth = 4;
      ctx.strokeRect(180, h - 100, w - 360, 70);
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.fillRect(180, h - 100, w - 360, 70);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("👣 여기에 발을 모으고 이쁘게 서세요", w / 2, h - 60);
    } else if (examTask === "escalator_handrail") {
      ctx.strokeStyle = "#db2777";
      ctx.lineWidth = 4;
      ctx.strokeRect(w - 180, 140, 120, 150);
      ctx.fillStyle = "rgba(219, 39, 119, 0.15)";
      ctx.fillRect(w - 180, 140, 120, 150);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("✊ 오른손을 여기에 대세요 (손잡이)", w - 120, 120);
    } else if (examTask === "elevator_door") {
      ctx.strokeStyle = "#f43f5e";
      ctx.lineWidth = 4;
      ctx.strokeRect(w / 2 - 100, 80, 200, h - 140);
      ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
      ctx.fillRect(w / 2 - 100, 80, 200, h - 140);
      ctx.fillStyle = "#ffffff";
      ctx.fillText("🚪 문틈에서 한 발자국 물러나기 (안전 구역)", w / 2, h - 35);
    } else if (examTask === "elevator_bell") {
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(16, 185, 129, 0.15)";
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillText("🔔 가상 비상벨을 손가락으로 꾹 누르는 포즈", w / 2, h / 2 - 50);
    }
  };

  // Draw lovely perfect cartoon safety posture for the task
  const drawCartoonPosture = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Background sky and grassy garden
    ctx.fillStyle = "#e0f2fe"; // sweet sky blue
    ctx.fillRect(0, 0, w, h);

    // Dotted clouds
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(100, 80, 15, 0, Math.PI * 2);
    ctx.arc(120, 70, 20, 0, Math.PI * 2);
    ctx.arc(140, 80, 15, 0, Math.PI * 2);
    ctx.fill();

    // Rolling hill
    ctx.fillStyle = "#bbf7d0";
    ctx.beginPath();
    ctx.ellipse(w / 2, h, w / 1.3, h / 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Center safety check frame
    ctx.strokeStyle = "rgba(244, 114, 182, 0.3)";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(30, 30, w - 60, h - 60);
    ctx.setLineDash([]);

    // Title label
    ctx.fillStyle = "#db2777";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`🎮 연습 인형의 정석 자세: ${getTaskName(examTask)}`, w / 2, 55);

    // Drawing the perfect safety avatar with puppy ears
    const cx = w / 2;
    const cy = h / 2 + 10;

    // Puppy ears
    ctx.fillStyle = "#facc15"; // yellow puppy ears
    ctx.strokeStyle = "#7c2d12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx - 20, cy - 66, 8, 15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.ellipse(cx + 20, cy - 66, 8, 15, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Head
    ctx.fillStyle = "#ffe4e6";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy - 60, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Smiling face with pink blushing cheeks
    ctx.fillStyle = "rgba(244, 114, 182, 0.4)";
    ctx.beginPath();
    ctx.arc(cx - 11, cy - 54, 4, 0, Math.PI * 2);
    ctx.arc(cx + 11, cy - 54, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(cx - 9, cy - 64, 3, 0, Math.PI * 2);
    ctx.arc(cx + 9, cy - 64, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy - 52, 7, 0, Math.PI);
    ctx.stroke();

    // Body shirt (pastel green)
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.roundRect(cx - 22, cy - 30, 44, 62, 10);
    ctx.fill();
    ctx.stroke();

    // Gold Star badge on shirt
    ctx.fillStyle = "#facc15";
    ctx.font = "12px sans-serif";
    ctx.fillText("⭐", cx, cy - 5);

    // Specific task pose modifications
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 4;

    if (examTask === "escalator_line") {
      // Hands down
      ctx.beginPath(); ctx.moveTo(cx - 22, cy - 25); ctx.lineTo(cx - 38, cy + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 22, cy - 25); ctx.lineTo(cx + 38, cy + 15); ctx.stroke();

      // Legs tight
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 32); ctx.lineTo(cx - 10, cy + 80);
      ctx.moveTo(cx + 10, cy + 32); ctx.lineTo(cx + 10, cy + 80);
      ctx.stroke();

      // Safe step drawn underneath
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(cx - 35, cy + 80, 70, 15);
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cx - 35, cy + 80, 70, 15);

      // Hazard red edges
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(cx - 65, cy + 80, 30, 15);
      ctx.fillRect(cx + 35, cy + 80, 30, 15);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("노란선", cx - 50, cy + 91);
      ctx.fillText("노란선", cx + 50, cy + 91);

    } else if (examTask === "escalator_handrail") {
      ctx.beginPath(); ctx.moveTo(cx - 22, cy - 25); ctx.lineTo(cx - 38, cy + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 22, cy - 25); ctx.lineTo(cx + 46, cy - 40); ctx.stroke();

      ctx.fillStyle = "#ffe4e6";
      ctx.beginPath(); ctx.arc(cx + 46, cy - 40, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 32); ctx.lineTo(cx - 12, cy + 80);
      ctx.moveTo(cx + 10, cy + 32); ctx.lineTo(cx + 12, cy + 80);
      ctx.stroke();

      // Diagonal handrail line (cute pink)
      ctx.strokeStyle = "#ec4899";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx + 20, cy - 15);
      ctx.lineTo(cx + 65, cy - 60);
      ctx.stroke();

    } else if (examTask === "elevator_door") {
      // Hands folded calmly
      ctx.beginPath();
      ctx.moveTo(cx - 22, cy - 20);
      ctx.lineTo(cx - 4, cy - 5);
      ctx.lineTo(cx + 4, cy - 5);
      ctx.lineTo(cx + 22, cy - 20);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 32); ctx.lineTo(cx - 10, cy + 80);
      ctx.moveTo(cx + 10, cy + 32); ctx.lineTo(cx + 10, cy + 80);
      ctx.stroke();

      // Sliding elevator doors left and right
      ctx.fillStyle = "rgba(244, 63, 94, 0.15)";
      ctx.fillRect(0, 0, 110, h);
      ctx.fillRect(w - 110, 0, 110, h);
      ctx.strokeStyle = "rgba(244, 63, 94, 0.4)";
      ctx.lineWidth = 2.5;
      ctx.strokeRect(0, 0, 110, h);
      ctx.strokeRect(w - 110, 0, 110, h);

    } else if (examTask === "elevator_bell") {
      ctx.beginPath(); ctx.moveTo(cx - 22, cy - 25); ctx.lineTo(cx - 38, cy + 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 22, cy - 25); ctx.lineTo(cx + 44, cy - 15); ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 32); ctx.lineTo(cx - 12, cy + 80);
      ctx.moveTo(cx + 10, cy + 32); ctx.lineTo(cx + 12, cy + 80);
      ctx.stroke();

      // Cute big pink bell button on wall
      ctx.fillStyle = "#db2777";
      ctx.beginPath(); ctx.arc(cx + 65, cy - 15, 14, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px sans-serif";
      ctx.fillText("벨", cx + 65, cy - 11);
    }

    // Cute red shoes
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.roundRect(cx - 19, cy + 80, 16, 8, 4);
    ctx.roundRect(cx + 3, cy + 80, 16, 8, 4);
    ctx.fill();
    ctx.stroke();
  };

  const getTaskName = (task: SafetyTaskType): string => {
    if (task === "escalator_line") return "에스컬레이터 노란선 서기 👣";
    if (task === "escalator_handrail") return "에스컬레이터 손잡이 잡기 ✊";
    if (task === "elevator_door") return "엘리베이터 문틈 멀리 서기 🚪";
    return "엘리베이터 비상벨 대처 🔔";
  };

  // Submit Snapshot to backend Gemini vision check
  const startExamCheck = async () => {
    if (!userName.trim()) {
      alert("임명장에 인쇄될 대원님의 이름을 꼬옥 먼저 써주세요! ✏️");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      alert("카메라 준비가 아직 안 되었어요. 잠시만 기다려주세요!");
      return;
    }

    // Capture snapshot FIRST while everything is fully mounted
    const base64Image = canvas.toDataURL("image/jpeg", 0.8);

    setAnalyzing(true);
    setAnalysisResult(null);

    try {
      const response = await fetch("/api/safety-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          task: examTask,
          userName: userName
        })
      });

      if (!response.ok) {
        throw new Error("서버랑 연결이 약해졌어요. 다시 해볼까요?");
      }

      const data = await response.json();

      setAnalysisResult({
        passed: data.passed,
        score: data.score,
        feedback: data.feedback,
        simulated: data.simulated
      });

      if (data.passed) {
        const certId = `꼬마대원-2026-${Math.floor(1000 + Math.random() * 9000)}`;
        setCertificate({
          id: certId,
          userName: userName,
          date: new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
          tasksCompleted: [getTaskName(examTask)],
          score: data.score
        });
      }

    } catch (err: any) {
      console.error(err);
      alert("안전 점검 분석 중 오류가 생겼어요: " + err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in" id="safety-exam">
      
      {/* Upper header - Rounded pink card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-[2rem] p-6 md:p-8 border-4 border-purple-200/60 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-purple-200 text-purple-950 text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider animate-bounce-slow">
            <Sparkles className="w-3.5 h-3.5" />
            AI 지킴이 로봇 채점관 🤖
          </div>
          <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display">
            안전 지킴이 졸업 임명장 시험장! 🎓
          </h2>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            카메라 앞에서 정직하고 예쁘게 안전 포즈를 취해보세요! 지킴이 로봇 삼촌이 사진을 보고 심사하여, 멋진 보배로운 <b>임명 수료증</b>을 수여해 준답니다! 😊
          </p>
        </div>

        {/* User Name input check */}
        <div className="bg-purple-100/50 p-4 rounded-[1.5rem] border-2 border-purple-200 flex items-center gap-3 shrink-0">
          <div className="space-y-1">
            <label className="block text-[11px] font-black text-purple-700">지킴이 대원의 이름 ✏️</label>
            <input
              type="text"
              id="cert-name-input"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="내 이름 쓰기"
              className="bg-white border-2 border-purple-200 text-xs px-3 py-1.5 rounded-xl text-gray-800 font-black focus:outline-none focus:ring-2 focus:ring-purple-400 w-36"
            />
          </div>
        </div>
      </div>

      {analysisResult === null ? (
        /* Setup Phase */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">
          
          {/* Main Camera Frame */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-950 rounded-[2rem] overflow-hidden shadow-md border-4 border-slate-800 aspect-[4/3] relative">
              
              {useWebcam && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="absolute w-[1px] h-[1px] opacity-0 pointer-events-none"
                  width={640}
                  height={480}
                />
              )}

              <canvas
                ref={canvasRef}
                width={640}
                height={480}
                className="w-full h-full block object-cover"
              />

              {useWebcam && webcamStatus === "requesting" && (
                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center text-white space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-purple-400" />
                  <p className="text-xs font-bold text-slate-300">카메라 눈동자를 꼬옥 뜨고 있어요... 📸</p>
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div className="bg-white p-4 rounded-3xl border-2 border-purple-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <button
                onClick={() => setUseWebcam(!useWebcam)}
                className={`w-full sm:w-auto px-4 py-2.5 rounded-2xl font-black text-xs transition flex items-center justify-center gap-1.5 border-2 ${
                  useWebcam
                    ? "bg-slate-800 text-purple-300 border-slate-700"
                    : "bg-white hover:bg-purple-50 text-slate-700 border-slate-200"
                }`}
              >
                <Camera className="w-4 h-4" />
                {useWebcam ? "카메라 끄기" : "내 얼굴 실시간 카메라 켜기"}
              </button>

              <button
                onClick={startExamCheck}
                disabled={userName.trim() === ""}
                className={`w-full sm:w-auto px-8 py-3 rounded-2xl font-black text-xs shadow transition flex items-center justify-center gap-1.5 border-2 ${
                  userName.trim() !== ""
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400 active:scale-95"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed border-gray-300 shadow-none"
                }`}
              >
                <FileCheck className="w-4 h-4" />
                📷 사진 찰칵! 채점받기 🌟
              </button>
            </div>
          </div>

          {/* Right level selection parameters */}
          <div className="space-y-6 text-left">
            <div className="bg-white rounded-[2rem] p-6 border-4 border-purple-100 shadow-sm space-y-4">
              <h3 className="font-black text-slate-800 text-base font-display flex items-center gap-1.5">
                <span>🎒</span> 시험 볼 과목 선택
              </h3>
              <p className="text-[11px] text-slate-500 font-bold leading-normal">
                연습하고 싶은 안전 수칙을 골라보세요:
              </p>

              <div className="space-y-2">
                {[
                  { id: "escalator_line", name: "👣 번개선 안쪽에 서기", desc: "노란선 경계에 발을 대지 않고 얌전하게" },
                  { id: "escalator_handrail", name: "✊ 동글 손잡이 꼭 잡기", desc: "오른손을 쭉 뻗어서 손잡이를 잡아요" },
                  { id: "elevator_door", name: "🚪 문틈에서 뒤로 물러서기", desc: "안전 지대 안에 가만히 서기" },
                  { id: "elevator_bell", name: "🔔 삐뽀 비상벨 꾹 누르기", desc: "정전이 되면 빨간 종을 누르기" }
                ].map((task) => (
                  <button
                    key={task.id}
                    onClick={() => setExamTask(task.id as SafetyTaskType)}
                    className={`w-full text-left p-3 rounded-2xl border-2 transition-all ${
                      examTask === task.id
                        ? "bg-purple-50 border-purple-400 shadow-sm"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="font-black text-slate-800 text-xs sm:text-sm">{task.name}</div>
                    <div className="text-[10px] text-slate-500 font-bold mt-0.5">{task.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Precheck tips */}
            <div className="bg-purple-100/30 border-2 border-purple-200 rounded-[2rem] p-5 text-purple-900 space-y-2.5">
              <h4 className="font-black text-xs flex items-center gap-1 text-purple-950">
                <span>⭐</span> 백점 맞는 요령 꿀팁!
              </h4>
              <ul className="space-y-1.5 text-[11px] leading-relaxed font-bold text-purple-800">
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>카메라 가이드라인 핑크 박스에 발이나 손을 정확히 맞추어 찰칵 찍어주세요!</span>
                </li>
                <li className="flex items-start gap-1">
                  <span>•</span>
                  <span>카메라가 꺼져 있어도 정석 안전 자세 인형을 얌전히 세워둔 채 찰칵 전송하면 AI 삼촌이 만점을 준답니다! 😊</span>
                </li>
              </ul>
            </div>
          </div>

          {analyzing && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md text-white rounded-[2rem] p-12 text-center flex flex-col items-center justify-center space-y-6 z-50">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-400 rounded-full animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="text-lg font-black text-pink-300 font-display animate-pulse">
                  Gemini AI 스마트 분석소 작동 중! 🔮
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-bold">
                  {loadingMessages[loadMsgIdx]}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Results state */
        <div className="space-y-6 animate-fade-in">
          
          <div className={`p-6 rounded-[2rem] border-4 ${
            analysisResult?.passed ? "bg-emerald-50 border-emerald-200" : "bg-rose-50 border-rose-200"
          } grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-left`}>
            
            {/* Score circle */}
            <div className="text-center md:border-r-2 border-slate-200 p-4 space-y-2 flex flex-col items-center justify-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                AI 안전 점수 결과
              </div>
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-4 border-white shadow-md bg-white relative">
                <span className={`text-2xl font-black font-display ${
                  analysisResult?.passed ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {analysisResult?.score}점
                </span>
                <span className={`absolute -bottom-1 text-[9px] text-white px-2.5 py-0.5 rounded-full font-black ${
                  analysisResult?.passed ? "bg-emerald-500" : "bg-rose-500"
                }`}>
                  {analysisResult?.passed ? "참 잘했어요!" : "아쉽게 탈락!"}
                </span>
              </div>
            </div>

            {/* Feedback message */}
            <div className="md:col-span-2 space-y-3">
              <h4 className="font-black text-slate-800 text-lg font-display flex items-center gap-1">
                {analysisResult?.passed ? "🎉 만장일치 임명장 수여 결정!" : "⚠️ 지킴이 로봇 삼촌의 격려 한마디!"}
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-inner font-bold">
                {analysisResult?.feedback}
              </p>

              <button
                onClick={() => {
                  setAnalysisResult(null);
                  setCertificate(null);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-black px-4 py-2 rounded-xl text-xs transition active:scale-95 flex items-center gap-1 inline-flex"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                다시 안전 시험 치르기 🎠
              </button>
            </div>
          </div>

          {/* Golden Certificate (only displayed on pass) */}
          {analysisResult?.passed && certificate && (
            <div className="print:absolute print:inset-0 print:bg-white print:p-0">
              <div className="certificate-bg max-w-2xl mx-auto p-10 md:p-14 text-center rounded-[2.5rem] shadow-2xl relative space-y-8 overflow-hidden select-none border-8 border-amber-300 bg-gradient-to-br from-amber-50/50 via-yellow-50/20 to-orange-50/50">
                
                {/* Traditional Certificate Border Patterns */}
                <div className="absolute top-4 left-4 right-4 bottom-4 border-4 border-amber-200/40 pointer-events-none rounded-3xl" />
                <div className="absolute top-6 left-6 right-6 bottom-6 border-2 border-dotted border-amber-400/40 pointer-events-none rounded-2xl" />

                <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-300/10 rounded-full blur-xl pointer-events-none" />

                {/* Core Certificate Content */}
                <div className="space-y-2">
                  <div className="flex justify-center">
                    <span className="text-5xl animate-bounce">👑</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black font-display text-amber-800 tracking-widest mt-2">
                    꼬마 안전 지킴이 임명장
                  </h3>
                  <p className="text-[10px] font-mono tracking-widest text-amber-600/80 font-black">
                    OFFICIAL SECURITY GUARDIAN COMMISSION
                  </p>
                </div>

                <div className="space-y-6 py-6 border-y-2 border-amber-200">
                  <div className="space-y-1">
                    <p className="text-xs text-amber-700 font-bold">위 어린이 대원</p>
                    <h4 className="text-2xl font-black text-slate-800 font-display">
                      {certificate.userName} 대원
                    </h4>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed font-serif font-bold">
                    위 대원은 실시간 스마트 웹캠 AI 안전 교육 시험관 삼촌 앞에서 실시한 에스컬레이터와 엘리베이터의 올바른 정석 자세를 아주 씩씩하고 기특하게 성공했기에, 이 세상을 밝고 안전하게 지킬 <b>제1기 공식 안전 수호 대원</b>으로 정식 임명하며 본 임명장을 가슴 깊이 가득 안겨 드립니다! 🏆🧸💖
                  </p>
                </div>

                {/* Footer certifications info */}
                <div className="flex justify-between items-end pt-2 px-2 text-left">
                  <div className="space-y-1">
                    <div className="text-[9px] text-slate-400 font-mono font-bold">임명 코드번호: {certificate.id}</div>
                    <div className="text-xs text-slate-700 font-black">{certificate.date}</div>
                  </div>

                  <div className="relative flex flex-col items-center">
                    {/* Cute Round Seal with teddy bear */}
                    <div className="w-16 h-16 rounded-full border-4 border-double border-amber-500 flex items-center justify-center bg-white shadow-sm relative">
                      <span className="text-2xl">🧸</span>
                    </div>
                    <span className="text-[9px] font-black text-amber-700 mt-1.5 tracking-wider">안전 로봇 삼촌 직인</span>
                  </div>
                </div>
              </div>

              {/* Action buttons for printing/saving certificate */}
              <div className="flex justify-center gap-4 mt-6 print:hidden">
                <button
                  onClick={handlePrint}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-6 py-3.5 rounded-2xl text-xs transition active:scale-95 flex items-center gap-1.5 shadow-md cursor-pointer border-2 border-purple-400"
                >
                  <Printer className="w-4 h-4" />
                  임명장 인쇄하거나 이미지로 저장하기! 🖨️
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
