import React, { useState } from "react";
import { SAFETY_TASKS } from "../data/tasks";
import { HelpCircle, CheckCircle2, XCircle, Award, RefreshCcw, ArrowRight, Sparkles } from "lucide-react";

interface SafetyQuizProps {
  userName: string;
}

export default function SafetyQuiz({ userName }: SafetyQuizProps) {
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [quizFinished, setQuizFinished] = useState<boolean>(false);

  const currentTask = SAFETY_TASKS[currentQuestionIdx];

  const handleOptionSelect = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentTask.quizAnswerIndex;
    if (isCorrect) {
      setScore((prev) => prev + 25); // 25 points per question (4 questions total)
      playAudioCue("success");
    } else {
      playAudioCue("fail");
    }
  };

  const playAudioCue = (type: "success" | "fail") => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (type === "success") {
        // Upward cartoon chime
        const notes = [523.25, 659.25, 783.99, 1046.50];
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
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.45);
      }
    } catch (e) {
      console.warn("Audio feedback blocked:", e);
    }
  };

  const handleNextQuestion = () => {
    setSelectedOption(null);
    setIsAnswered(false);

    if (currentQuestionIdx < SAFETY_TASKS.length - 1) {
      setCurrentQuestionIdx((prev) => prev + 1);
    } else {
      setQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQuestionIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="safety-quiz">
      
      {/* Category Header with a magical circus aesthetic */}
      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-[2rem] p-6 border-4 border-amber-200/70 shadow-sm flex flex-col sm:flex-row items-center gap-4 text-left">
        <div className="bg-amber-300 text-amber-950 p-3 rounded-2xl animate-bounce-slow shrink-0 text-xl">
          🎪
        </div>
        <div className="space-y-1">
          <h2 className="text-xl md:text-2xl font-black text-slate-800 font-display">
            안전 박사 꼬마 퀴즈 대회! 🏆
          </h2>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">
            귀여운 공룡과 동물 친구들이 내는 알록달록 퀴즈를 풀고 최고 명예로운 황금 안전 훈장을 받아보아요!
          </p>
        </div>
      </div>

      {!quizFinished ? (
        /* Quiz Running */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] p-6 md:p-8 border-4 border-amber-100 shadow-sm space-y-6 text-left">
              
              {/* Question Index Badge */}
              <div className="flex justify-between items-center">
                <span className="bg-amber-200 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-wider">
                  🧸 문제 {currentQuestionIdx + 1} / {SAFETY_TASKS.length}
                </span>

                <span className="text-xs text-slate-500 font-black">
                  ⭐ 내 점수: {score}점!
                </span>
              </div>

              {/* Quiz Question */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl animate-bounce-slow">{currentTask.emoji}</span>
                  <span className="text-[10px] font-black text-amber-500 tracking-widest uppercase">
                    {currentTask.category === "escalator" ? "🦕 에스컬레이터 모험" : "🐰 엘리베이터 모험"}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-800 leading-normal">
                  {currentTask.quizQuestion}
                </h3>
              </div>

              {/* Option cards */}
              <div className="grid grid-cols-1 gap-3">
                {currentTask.quizOptions.map((option, idx) => {
                  let buttonStyle = "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-700 font-bold";
                  
                  if (isAnswered) {
                    if (idx === currentTask.quizAnswerIndex) {
                      buttonStyle = "bg-emerald-50 border-emerald-400 text-emerald-900 font-black shadow-inner";
                    } else if (idx === selectedOption) {
                      buttonStyle = "bg-rose-50 border-rose-400 text-rose-900 font-black";
                    } else {
                      buttonStyle = "bg-gray-50 border-gray-100 text-gray-300 opacity-60";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isAnswered}
                      onClick={() => handleOptionSelect(idx)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-150 flex items-center justify-between text-xs sm:text-sm shadow-sm ${buttonStyle} ${
                        !isAnswered && "active:scale-[0.98] cursor-pointer"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="bg-white/80 px-2 py-0.5 rounded-full text-[10px] text-slate-400 border border-slate-200">
                          {idx + 1}
                        </span>
                        {option}
                      </span>
                      
                      {isAnswered && idx === currentTask.quizAnswerIndex && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      )}
                      {isAnswered && idx === selectedOption && idx !== currentTask.quizAnswerIndex && (
                        <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Core Next Question button trigger */}
              {isAnswered && (
                <button
                  onClick={handleNextQuestion}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-900 hover:from-amber-300 hover:to-yellow-300 border-2 border-yellow-300 font-black px-6 py-4 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
                >
                  <span>
                    {currentQuestionIdx === SAFETY_TASKS.length - 1 ? "🎨 결과 보러 가기! 🥁" : "다음 퀴즈로 고고씽! 🌈"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right Explanation Panel (Visible on answer) */}
          <div className="space-y-6 text-left">
            {isAnswered ? (
              <div className={`rounded-[2rem] p-6 border-4 animate-pulse-slow space-y-4 shadow-sm ${
                selectedOption === currentTask.quizAnswerIndex
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : "bg-rose-50 border-rose-200 text-rose-950"
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black">
                    {selectedOption === currentTask.quizAnswerIndex ? "🎉 딩동댕! 정답이에요!" : "😢 다음엔 맞출 수 있어요!"}
                  </span>
                </div>
                <p className="text-xs leading-relaxed font-bold">
                  {currentTask.quizExplanation}
                </p>
              </div>
            ) : (
              <div className="bg-amber-100/30 border-2 border-amber-200 rounded-[2rem] p-6 text-amber-900 text-center space-y-3">
                <div className="mx-auto text-3xl animate-bounce-slow">🦖</div>
                <h4 className="font-black text-xs sm:text-sm text-amber-950">공룡 박사의 깜짝 꿀팁!</h4>
                <p className="text-[11px] leading-relaxed text-amber-800 font-bold">
                  질문을 꼼꼼하게 읽고, 안전하게 행동하는 방법을 골라보세요! 답을 맞추면 귀여운 요정들이 친절하게 가르쳐 준답니다!
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quiz Finished Summary */
        <div className="bg-white rounded-[2rem] p-8 md:p-10 border-4 border-amber-200 shadow-md text-center max-w-xl mx-auto space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-yellow-100 p-4 rounded-full shadow animate-bounce-slow">
                <span className="text-5xl">👑</span>
              </div>
            </div>
            <h3 className="text-2xl font-black text-slate-800 font-display">
              {score === 100 ? "🌟 최고 영웅! 만점 대원 등극!" : "👍 퀴즈를 아주 멋지게 완료했어요!"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 font-bold">
              🎉 <span className="text-indigo-600 font-black">{userName || "지킴이"}</span> 꼬마 대원의 빛나는 퀴즈 성적표! 🎉
            </p>
          </div>

          {/* Large Score Banner */}
          <div className="bg-amber-50 border-2 border-amber-200 p-6 rounded-[2rem] inline-block px-12 relative">
            <div className="text-3xl sm:text-4xl font-black text-amber-700 font-display">
              {score}점 / 100점!
            </div>
            {score === 100 && (
              <div className="absolute -top-3 -right-3 bg-rose-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase shadow animate-bounce-slow">
                PERFECT ⭐
              </div>
            )}
          </div>

          {/* Explanation guidance */}
          <p className="text-xs text-slate-600 leading-relaxed max-w-md mx-auto font-bold">
            {score === 100
              ? "정말 최고예요! 에스컬레이터와 엘리베이터의 모든 안전 약속을 완벽하게 마스터하셨어요. 이제 주변 친구들과 가족들에게 모범이 되는 멋진 꼬마 지킴이가 되어주세요! 💖"
              : "조금 아쉽게 한 두 문제를 놓쳤지만 정말 훌륭하고 씩씩하게 끝마쳤어요! 한번 더 도전해서 빛나는 100점 왕관을 머리에 써볼까요? 😊"}
          </p>

          <div className="flex gap-4">
            <button
              onClick={handleRestartQuiz}
              className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-900 border-2 border-yellow-300 font-black px-6 py-4 rounded-2xl text-xs transition active:scale-95 shadow-md flex items-center justify-center gap-1.5"
            >
              <RefreshCcw className="w-4 h-4" />
              퀴즈 다시 타러 가기! 🎠
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
