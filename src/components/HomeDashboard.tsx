import React from "react";
import { SafetyTaskType, Stamp } from "../types";
import { SAFETY_TASKS } from "../data/tasks";
import { Shield, Award, Sparkles, CheckCircle2, Lock, Camera, BookOpen } from "lucide-react";

interface HomeDashboardProps {
  stamps: Stamp[];
  userName: string;
  setUserName: (name: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function HomeDashboard({
  stamps,
  userName,
  setUserName,
  setActiveTab,
}: HomeDashboardProps) {
  const completedCount = stamps.filter((s) => s.completed).length;
  const progressPercent = (completedCount / SAFETY_TASKS.length) * 100;

  return (
    <div className="space-y-8" id="home-dashboard">
      
      {/* Hero Welcome Banner - Adorable Cotton Candy Cloud Theme */}
      <div className="relative overflow-hidden bg-gradient-to-r from-pink-300 via-rose-300 to-amber-200 rounded-[2.5rem] p-8 md:p-10 text-slate-800 shadow-md border-4 border-white">
        
        {/* Playful Floating Decors */}
        <div className="absolute right-4 top-4 text-4xl animate-bounce-slow select-none">🎈</div>
        <div className="absolute right-1/4 bottom-3 text-3xl animate-pulse-slow select-none opacity-80">☁️</div>
        <div className="absolute left-1/3 top-2 text-3xl animate-float-cloud select-none opacity-60">🌈</div>
        <div className="absolute left-6 bottom-4 text-2xl select-none animate-bounce-slow">✨</div>

        <div className="max-w-2xl space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/75 px-4 py-2 rounded-full text-rose-600 text-xs sm:text-sm font-black tracking-wide shadow-sm">
            <span className="animate-spin text-base">⭐</span>
            안녕! 우리 멋진 어린이 안전 지킴이 대원님!
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-extrabold font-display leading-tight text-slate-900">
              카메라로 찰칵! 📸 <br />
              <span className="text-rose-500 underline decoration-rose-400 underline-offset-4 decoration-wavy">에스컬레이터 & 엘리베이터</span> 안전 대모험!
            </h1>
            <p className="text-slate-700 text-sm md:text-base leading-relaxed font-semibold">
              직접 웹캠 카메라 앞에 서서 안전 규칙 동작을 따라해보는 놀이터예요! 🧸<br />
              재미있게 게임을 하며 스탬프를 가득 모으면, 인공지능 로봇 친구가 귀엽고 멋진 <b>황금 수료증</b>을 전해 줄 거예요! 🎉
            </p>
          </div>

          {/* User Name Input Section - Toddler Friendly Pastel Look */}
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-3xl flex flex-col sm:flex-row items-center gap-3 max-w-md border-4 border-rose-100 shadow-sm">
            <div className="w-full text-left">
              <label className="block text-xs text-rose-500 mb-1 font-black flex items-center gap-1">
                <span>🧸</span> 대원님의 이름을 여기에 쏙 적어주세요!
              </label>
              <input
                type="text"
                id="user-name-input"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="귀여운 내 이름 입력하기"
                className="w-full bg-rose-50/50 text-gray-800 px-4 py-2.5 rounded-2xl border-2 border-rose-200 focus:outline-none focus:ring-2 focus:ring-pink-400 text-sm font-black placeholder:text-gray-400"
              />
            </div>
            <button
              onClick={() => setActiveTab("escalator")}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 active:scale-95 text-slate-800 font-black px-6 py-3.5 rounded-2xl transition duration-150 shadow-md text-xs sm:text-sm whitespace-nowrap self-end border-2 border-amber-300"
            >
              🚀 모험 출발!
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Stamp Book - Soft Cloud Box */}
      <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-md border-4 border-pink-100/50 space-y-6 relative overflow-hidden">
        <div className="absolute left-0 top-0 w-32 h-32 bg-pink-100/30 rounded-full -translate-x-12 -translate-y-12 pointer-events-none" />
        <div className="absolute right-0 bottom-0 w-40 h-40 bg-indigo-100/20 rounded-full translate-x-12 translate-y-12 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display flex items-center gap-2">
              <span className="text-2xl animate-bounce-slow">🎨</span>
              {userName ? `${userName} 대원의` : "내 손으로 완성하는"} 동글동글 스탬프북
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 font-semibold mt-1">
              네 가지 비밀 미션을 완료하고, 꾹꾹! 황금 별 스탬프를 모아보아요! ⭐
            </p>
          </div>

          {/* Toddler Progress Bar */}
          <div className="flex items-center gap-3 bg-rose-50/50 px-4 py-3 rounded-2xl border-2 border-rose-100 min-w-[200px]">
            <div className="flex-1">
              <div className="flex justify-between text-xs font-black text-rose-600 mb-1">
                <span>⭐ 미션 클리어 점수</span>
                <span>{completedCount} / 4 완료!</span>
              </div>
              <div className="w-full h-4 bg-rose-100 rounded-full overflow-hidden p-0.5 border border-rose-200">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-rose-400 rounded-full transition-all duration-700 animate-pulse-slow"
                  style={{ width: `${progressPercent || 5}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stamps Grid with adorable bounce animations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative z-10">
          {SAFETY_TASKS.map((task, idx) => {
            const stamp = stamps.find((s) => s.taskId === task.id);
            const isCompleted = stamp?.completed;
            
            // Toddler style colorful tags for different tasks
            const themeColors = [
              { bg: "bg-sky-50 border-sky-200", text: "text-sky-600", dot: "bg-sky-400" },
              { bg: "bg-pink-50 border-pink-200", text: "text-pink-600", dot: "bg-pink-400" },
              { bg: "bg-purple-50 border-purple-200", text: "text-purple-600", dot: "bg-purple-400" },
              { bg: "bg-amber-50 border-amber-200", text: "text-amber-600", dot: "bg-amber-400" }
            ][idx % 4];

            return (
              <div
                key={task.id}
                className={`relative group rounded-3xl p-6 border-2 transition-all duration-300 flex flex-col items-center justify-between text-center overflow-hidden hover:-translate-y-2 hover:shadow-lg ${
                  isCompleted
                    ? "bg-gradient-to-b from-amber-50 to-orange-50 border-amber-300 shadow-sm"
                    : `${themeColors.bg} hover:border-pink-300`
                }`}
              >
                {/* Stamp Circle Overlay */}
                <div className={`relative mb-4 flex items-center justify-center w-24 h-24 rounded-full bg-white shadow-inner border-2 ${
                  isCompleted ? "border-amber-300" : "border-slate-100"
                }`}>
                  {isCompleted ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-amber-100/70 animate-pulse-slow">
                      <span className="text-4xl filter drop-shadow">⭐</span>
                      <span className="text-[10px] font-black text-amber-700 mt-1">참 잘했어요</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-3xl text-gray-300 filter grayscale opacity-40 mb-1">{task.emoji}</span>
                      <span className="text-[9px] font-bold text-gray-400">도전 대기</span>
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 text-white rounded-full p-1.5 shadow border-2 border-white">
                      <CheckCircle2 className="w-4 h-4 text-amber-950 font-black" />
                    </div>
                  )}
                </div>

                <div className="space-y-1 z-10">
                  <div className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider ${themeColors.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${themeColors.dot}`} />
                    {task.category === "escalator" ? "에스컬레이터" : "엘리베이터"}
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">{task.title}</h3>
                  <p className="text-[11px] text-slate-500 px-2 leading-relaxed h-10 overflow-hidden line-clamp-2">
                    {task.description}
                  </p>
                </div>

                <div className="mt-4 w-full z-10">
                  {isCompleted ? (
                    <div className="bg-amber-100/80 border border-amber-300 text-amber-800 text-xs font-black py-1.5 px-3 rounded-2xl inline-flex items-center gap-1">
                      👑 참잘했어요 점수: {stamp?.score}점
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveTab(task.category)}
                      className="w-full bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-slate-200 hover:border-pink-300 text-xs font-black py-2 px-3 rounded-2xl transition duration-150 active:scale-95 shadow-sm"
                    >
                      🎪 미션 시작하기!
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Goal to Final Certificate - Adorable Sparkly Yellow Ribbon Container */}
      <div className="bg-gradient-to-r from-amber-100 to-yellow-100 rounded-[2.5rem] p-6 md:p-8 border-4 border-amber-300 shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute -left-4 -bottom-4 text-6xl opacity-20 pointer-events-none">⭐</div>
        <div className="absolute -right-4 -top-4 text-6xl opacity-20 pointer-events-none">✨</div>

        <div className="space-y-2 max-w-xl text-left relative z-10">
          <h3 className="text-lg sm:text-xl font-black text-amber-950 font-display flex items-center gap-2">
            <span className="text-2xl animate-bounce-slow">👑</span>
            명예의 꼬마 지키미 황금 수료증 획득하기!
          </h3>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-semibold">
            네 개의 미션을 씩씩하게 성공하셨나요? 혹은 멋진 웹캠 앞에 서서 내 안전 포즈를 칭찬받고 싶으신가요?<br />
            <b>'AI 수료증 시험'</b> 버튼을 눌러 카메라 셀카를 찍으면, 인공지능 로봇 선생님이 우주에서 가장 예쁜 인증서를 인쇄해 줄게요! 💖
          </p>
        </div>

        <button
          onClick={() => setActiveTab("certificate")}
          disabled={completedCount < 4}
          className={`w-full md:w-auto px-8 py-4 rounded-[1.5rem] font-black transition-all flex items-center justify-center gap-2 shadow-md border-2 ${
            completedCount >= 4
              ? "bg-rose-500 hover:bg-rose-400 text-white border-rose-400 hover:scale-105 active:scale-95 cursor-pointer"
              : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed shadow-none"
          }`}
        >
          {completedCount >= 4 ? (
            <>
              <Camera className="w-5 h-5 animate-bounce" />
              📸 황금 수료증 시험 시작하기!
            </>
          ) : (
            <>
              <Lock className="w-5 h-5 shrink-0" />
              자물쇠 해제까지 미션 {4 - completedCount}개 더 필요해요!
            </>
          )}
        </button>
      </div>

      {/* Visual Safety Education Tips Section - Pastel Colorful Twin Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-sky-50 border-4 border-sky-100 rounded-[2.5rem] p-6 space-y-4 shadow-sm text-left relative overflow-hidden">
          <div className="absolute -right-2 -top-2 text-5xl opacity-10 pointer-events-none">🦕</div>
          <div className="flex items-center gap-3">
            <div className="bg-sky-400 text-white p-2.5 rounded-2xl shadow-sm font-black text-xl">
              👣
            </div>
            <h4 className="text-base sm:text-lg font-black text-sky-950 font-display">에스컬레이터에서 약속해요!</h4>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-sky-900 font-semibold">
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-sky-100">
              <span className="text-sky-500 font-black text-base">①</span>
              <span><b>걸어가거나 뛰지 않아요:</b> 미끄럼틀처럼 장난치면 절대 안 돼요! 손잡이를 잡고 한자리에 얌전히 서 있어요.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-sky-100">
              <span className="text-sky-500 font-black text-base">②</span>
              <span><b>노란 번개선을 밟지 않아요:</b> 노란선 바깥 노란 영역의 정중앙에 두 발을 이쁘게 모으고 서요!</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-sky-100">
              <span className="text-sky-500 font-black text-base">③</span>
              <span><b>안전 손잡이를 꼭 잡아요:</b> 타자마자 옆의 안전한 고무 손잡이를 야무지게 꼭 붙잡아 균형을 유지해요.</span>
            </li>
          </ul>
        </div>

        <div className="bg-pink-50 border-4 border-pink-100 rounded-[2.5rem] p-6 space-y-4 shadow-sm text-left relative overflow-hidden">
          <div className="absolute -right-2 -top-2 text-5xl opacity-10 pointer-events-none">🐰</div>
          <div className="flex items-center gap-3">
            <div className="bg-pink-400 text-white p-2.5 rounded-2xl shadow-sm font-black text-xl">
              🚪
            </div>
            <h4 className="text-base sm:text-lg font-black text-pink-950 font-display">엘리베이터에서 약속해요!</h4>
          </div>
          <ul className="space-y-3 text-xs sm:text-sm text-pink-900 font-semibold">
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-pink-100">
              <span className="text-pink-500 font-black text-base">①</span>
              <span><b>문틈에 기대서지 않아요:</b> 문에 등을 대고 서면 덜컹 문이 흔들릴 수 있어요. 한걸음 뒤로 서요.</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-pink-100">
              <span className="text-pink-500 font-black text-base">②</span>
              <span><b>문틈에 손가락을 대지 않아요:</b> 문이 스르륵 열리며 손을 숨겨놓으면 문안으로 낄 수 있어 아파요!</span>
            </li>
            <li className="flex items-start gap-2 bg-white/60 p-2.5 rounded-2xl border border-pink-100">
              <span className="text-pink-500 font-black text-base">③</span>
              <span><b>안에서 쿵쾅쿵쾅 뛰지 않아요:</b> 우주선처럼 점프를 뛰면, 엘리베이터가 무서워서 딱 멈출 수도 있어요!</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
