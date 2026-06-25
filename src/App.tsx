import React, { useState, useEffect } from "react";
import HomeDashboard from "./components/HomeDashboard";
import EscalatorGame from "./components/EscalatorGame";
import ElevatorGame from "./components/ElevatorGame";
import SafetyQuiz from "./components/SafetyQuiz";
import { Stamp, SafetyTaskType } from "./types";
import { Shield, Home, Compass, DoorOpen, Award, GraduationCap, Sparkles } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("home");
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem("safety_user_name_v1") || "";
  });
  const [showSuccessPopup, setShowSuccessPopup] = useState<boolean>(false);
  const [successTaskName, setSuccessTaskName] = useState<string>("");

  const [stamps, setStamps] = useState<Stamp[]>(() => {
    const saved = localStorage.getItem("safety_stamps_v1");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse stamps", e);
      }
    }
    return [
      { taskId: "escalator_line", completed: false, score: 0 },
      { taskId: "escalator_handrail", completed: false, score: 0 },
      { taskId: "elevator_door", completed: false, score: 0 },
      { taskId: "elevator_bell", completed: false, score: 0 },
    ];
  });

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem("safety_user_name_v1", userName);
  }, [userName]);

  const handleAddStamp = (taskId: SafetyTaskType, score: number) => {
    // Determine the task name for the popup
    let taskName = "";
    if (taskId === "escalator_line") taskName = "에스컬레이터 노란선 서기 미션";
    else if (taskId === "escalator_handrail") taskName = "에스컬레이터 손잡이 잡기 미션";
    else if (taskId === "elevator_door") taskName = "엘리베이터 문틈 주의하기 미션";
    else if (taskId === "elevator_bell") taskName = "엘리베이터 어둠 속 비상벨 미션";
    
    setSuccessTaskName(taskName);
    setShowSuccessPopup(true);

    setStamps((prev) => {
      const updated = prev.map((s) =>
        s.taskId === taskId
          ? {
              ...s,
              completed: true,
              score: Math.max(s.score, score),
              dateCompleted: new Date().toLocaleDateString("ko-KR"),
            }
          : s
      );
      localStorage.setItem("safety_stamps_v1", JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearProgress = () => {
    if (window.confirm("정말로 모든 안전 훈련 기록과 획득한 스탬프를 리셋하시겠습니까?")) {
      const fresh = [
        { taskId: "escalator_line", completed: false, score: 0 },
        { taskId: "escalator_handrail", completed: false, score: 0 },
        { taskId: "elevator_door", completed: false, score: 0 },
        { taskId: "elevator_bell", completed: false, score: 0 },
      ];
      setStamps(fresh);
      localStorage.setItem("safety_stamps_v1", JSON.stringify(fresh));
      setUserName("");
      setActiveTab("home");
    }
  };

  const completedStampsCount = stamps.filter((s) => s.completed).length;

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans antialiased text-gray-800">
      
      {/* Global Safety Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab("home")}>
            <div className="bg-gradient-to-tr from-emerald-500 to-teal-500 text-white p-2 rounded-2xl shadow-sm">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 font-display sm:text-base">
                스마트 키즈 안전 스쿨
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
                Webcam AI Safety School
              </p>
            </div>
          </div>

          {/* Navigation Bar for Desktop */}
          <nav className="hidden md:flex items-center gap-1.5">
            {[
              { id: "home", label: "홈 & 스탬프북", icon: Home },
              { id: "escalator", label: "에스컬레이터 훈련", icon: Compass },
              { id: "elevator", label: "엘리베이터 훈련", icon: DoorOpen },
              { id: "quiz", label: "재미있는 퀴즈", icon: Award }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all duration-150 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-slate-900 text-white shadow-md"
                      : "text-gray-500 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          {/* User Status Badges */}
          <div className="flex items-center gap-2">
            {userName && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-teal-50 text-teal-800 text-xs font-bold px-3 py-1.5 rounded-full border border-teal-100">
                <Sparkles className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
                {userName} 지킴이 대원
              </span>
            )}
            
            <span className="bg-amber-100 text-amber-800 text-xs font-black px-3 py-1.5 rounded-full border border-amber-200">
              ⭐ 스탬프: {completedStampsCount}/4
            </span>
          </div>
        </div>
      </header>

      {/* Main Educational Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {activeTab === "home" && (
          <HomeDashboard
            stamps={stamps}
            userName={userName}
            setUserName={setUserName}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "escalator" && (
          <EscalatorGame onAddStamp={handleAddStamp} stamps={stamps} />
        )}

        {activeTab === "elevator" && (
          <ElevatorGame onAddStamp={handleAddStamp} stamps={stamps} />
        )}

        {activeTab === "quiz" && (
          <SafetyQuiz userName={userName} />
        )}
      </main>

      {/* Footer info & resetting options */}
      <footer className="bg-slate-900 text-slate-400 py-10 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-300">
              🏫 스마트 키즈 안전 스쿨 | 어린이용 에스컬레이터 & 엘리베이터 카메라 체험 교육 프로그램
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              본 앱은 실시간 웹캠 및 최첨단 Gemini 3.5 AI 비전 모델을 사용하여 안전 수칙 자세를 평가하고 수료증을 증여하는 체험 중심형 안전 학교입니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center md:justify-end">
            <button
              onClick={handleClearProgress}
              className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition underline cursor-pointer decoration-rose-500/50"
            >
              모든 안전 미션 기록 초기화
            </button>
            <span className="text-slate-700 text-xs hidden md:inline">|</span>
            <span className="text-[11px] text-slate-500">© 2026 AI Safety School. All rights reserved.</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Navigation Footer */}
      <nav className="md:hidden sticky bottom-0 z-50 bg-white border-t border-slate-100 grid grid-cols-4 h-16 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {[
          { id: "home", label: "홈", icon: Home },
          { id: "escalator", label: "에스컬레이터", icon: Compass },
          { id: "elevator", label: "엘리베이터", icon: DoorOpen },
          { id: "quiz", label: "퀴즈", icon: Award }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 transition ${
                isActive ? "text-slate-900 font-extrabold" : "text-gray-400"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[9px] font-bold">{tab.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Celebratory Congratulatory Victory Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md" id="success-celebration-popup">
          <div className="relative bg-white rounded-[3rem] p-8 max-w-md w-full border-8 border-yellow-300 text-center shadow-2xl animate-bounce-slow">
            {/* Playful Floating Decors */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-7xl select-none animate-bounce">🏆</div>
            <div className="absolute top-2 left-4 text-4xl select-none animate-pulse">🎉</div>
            <div className="absolute top-2 right-4 text-4xl select-none animate-pulse">✨</div>
            <div className="absolute bottom-4 left-4 text-3xl select-none">🎈</div>
            <div className="absolute bottom-4 right-4 text-3xl select-none">🧸</div>

            <div className="space-y-6 mt-4">
              <span className="inline-flex items-center gap-1.5 bg-yellow-100 text-yellow-800 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest animate-pulse">
                🏅 안전 미션 완전 통과! 🏅
              </span>
              
              <h3 className="text-2xl font-black text-slate-800">
                와아! 성공했어요! 🎉
              </h3>
              
              <div className="p-4 bg-pink-50 rounded-2xl border-2 border-pink-100 space-y-2">
                <p className="text-base font-extrabold text-pink-600">
                  [{successTaskName}]
                </p>
                <p className="text-xs font-bold text-slate-600 leading-relaxed">
                  {userName ? userName : "꼬마"} 대원님! 안전 약속을 너무 잘 지키는 씩씩한 영웅이네요! 멋진 스탬프를 도장북에 쾅 찍어줄게요! ✊
                </p>
              </div>

              <button
                onClick={() => setShowSuccessPopup(false)}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-300 hover:to-amber-300 text-slate-900 font-black py-3 px-6 rounded-2xl text-sm shadow-lg transition active:scale-95 border-2 border-amber-300 cursor-pointer"
              >
                👍 야호! 최고예요! (닫기)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
