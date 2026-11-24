import React, { useState, useEffect, useCallback, useRef } from 'react';

// 1. 필수 영단어 데이터셋 (20개)
interface WordItem {
  word: string;
  meaning: string;
}

const VOCABULARY: WordItem[] = [
  { word: 'accomplish', meaning: '완수하다, 성취하다' },
  { word: 'brilliant', meaning: '훌륭한, 뛰어난' },
  { word: 'collaborate', meaning: '협력하다, 공동 작업하다' },
  { word: 'deliberate', meaning: '의도적인, 신중한' },
  { word: 'efficient', meaning: '능률적인, 효율적인' },
  { word: 'fascinating', meaning: '매혹적인, 매우 흥미로운' },
  { word: 'genuine', meaning: '진짜의, 진실한' },
  { word: 'hesitate', meaning: '망설이다, 주저하다' },
  { word: 'inspire', meaning: '영감을 주다, 고무시키다' },
  { word: 'journey', meaning: '여정, 여행' },
  { word: 'knowledge', meaning: '지식, 앎' },
  { word: 'leverage', meaning: '활용하다, 영향력' },
  { word: 'magnificent', meaning: '웅장한, 감명 깊은' },
  { word: 'negotiate', meaning: '협상하다, 절충하다' },
  { word: 'opportunity', meaning: '기회' },
  { word: 'perseverance', meaning: '인내, 끈기' },
  { word: 'qualify', meaning: '자격을 얻다' },
  { word: 'resilient', meaning: '탄력 있는, 회복력 있는' },
  { word: 'significant', meaning: '중대한, 의미 있는' },
  { word: 'tremendous', meaning: '엄청난, 거대한' },
];

type GameStatus = 'ready' | 'playing' | 'gameover';

export default function App() {
  const [status, setStatus] = useState<GameStatus>('ready');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(() => {
    return Number(localStorage.getItem('vocab_best_score')) || 0;
  });
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);

  // 현재 퀴즈 데이터
  const [currentWord, setCurrentWord] = useState<WordItem | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Web Speech API를 활용한 영어 발음 재생
  const speakWord = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // 이전 발음 취소
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS 재생 실패:', e);
    }
  }, []);

  // 무작위 4지선다 문제 생성 함수
  const generateQuestion = useCallback(() => {
    const targetWord = VOCABULARY[Math.floor(Math.random() * VOCABULARY.length)];
    
    // 오답 3개 무작위 추출
    const otherMeanings = VOCABULARY
      .filter((v) => v.word !== targetWord.word)
      .map((v) => v.meaning)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    // 정답과 오답 합친 후 셔플
    const shuffledOptions = [...otherMeanings, targetWord.meaning].sort(
      () => Math.random() - 0.5
    );

    setCurrentWord(targetWord);
    setOptions(shuffledOptions);
    setSelectedIdx(null);
    setFeedback(null);

    // 문제 출제 시 자동 발음 1회 재생
    speakWord(targetWord.word);
  }, [speakWord]);

  // 게임 시작
  const startGame = () => {
    setTimeLeft(30);
    setScore(0);
    setCombo(0);
    setIsNewRecord(false);
    setStatus('playing');
    generateQuestion();
  };

  // 30초 타이머 루프
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status]);

  // 시간 초과 처리
  useEffect(() => {
    if (status === 'playing' && timeLeft === 0) {
      setStatus('gameover');
      if (score > bestScore) {
        setBestScore(score);
        setIsNewRecord(true);
        localStorage.setItem('vocab_best_score', score.toString());
      }
    }
  }, [timeLeft, status, score, bestScore]);

  // 정답 및 오답 판정 핸들러
  const handleSelect = (idx: number, selectedMeaning: string) => {
    if (feedback !== null || !currentWord) return; // 연속 클릭 방지

    setSelectedIdx(idx);
    const isCorrect = selectedMeaning === currentWord.meaning;

    if (isCorrect) {
      // 정답: 기본 10점 + 콤보 보너스(콤보당 2점)
      const bonus = combo * 2;
      setScore((prev) => prev + 10 + bonus);
      setCombo((prev) => prev + 1);
      setFeedback('correct');

      setTimeout(() => {
        generateQuestion();
      }, 350);
    } else {
      // 오답: 콤보 초기화 및 시간 2초 차감
      setCombo(0);
      setFeedback('wrong');
      setTimeLeft((prev) => Math.max(0, prev - 2));

      setTimeout(() => {
        generateQuestion();
      }, 450);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-2xl p-6 border border-slate-700">
        
        {/* 1. 시작 화면 */}
        {status === 'ready' && (
          <div className="text-center py-8 space-y-6">
            <div className="text-5xl animate-bounce">⏱️</div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              30초 영단어 스피드 퀴즈
            </h1>
            <p className="text-slate-400 text-sm">
              제한 시간 30초 동안 최대한 많은 영단어를 맞혀보세요!
              <br />오답 시 시간이 2초 차감됩니다.
            </p>
            <div className="bg-slate-700/60 p-4 rounded-xl border border-slate-600 inline-flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="text-slate-300 font-medium">최고 점수:</span>
              <span className="text-yellow-400 font-bold text-xl">{bestScore}점</span>
            </div>
            <div>
              <button
                onClick={startGame}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 transition-all text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 text-lg"
              >
                🚀 게임 시작
              </button>
            </div>
          </div>
        )}

        {/* 2. 플레이 화면 */}
        {status === 'playing' && currentWord && (
          <div className="space-y-6">
            {/* 상단 대시보드 */}
            <div className="flex items-center justify-between bg-slate-700/50 p-3 rounded-xl border border-slate-600">
              <div className="flex items-center gap-1.5 font-bold">
                <span>⏱️</span>
                <span className={`text-xl ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-emerald-400'}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="flex items-center gap-1 text-slate-300 font-semibold">
                <span>점수:</span>
                <span className="text-white text-lg font-bold">{score}</span>
              </div>
              <div className="flex items-center gap-1 text-orange-400 font-bold">
                <span>🔥</span>
                <span>{combo} COMBO</span>
              </div>
            </div>

            {/* 영단어 카드 & TTS 버튼 */}
            <div className="text-center py-6 bg-slate-900/60 rounded-2xl border border-slate-700/80 relative">
              <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">Vocabulary</span>
              <h2 className="text-3xl font-extrabold text-white mt-1 mb-3 tracking-wide">
                {currentWord.word}
              </h2>
              <button
                onClick={() => speakWord(currentWord.word)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold rounded-full border border-slate-600 transition"
              >
                <span>🔊</span> 다시 듣기
              </button>
            </div>

            {/* 4지선다 버튼 */}
            <div className="grid grid-cols-1 gap-3">
              {options.map((option, idx) => {
                let btnStyle = 'bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600';
                if (selectedIdx === idx) {
                  if (feedback === 'correct') {
                    btnStyle = 'bg-emerald-600 text-white border-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/40';
                  } else if (feedback === 'wrong') {
                    btnStyle = 'bg-rose-600 text-white border-rose-400 animate-[shake_0.4s_ease-in-out]';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={feedback !== null}
                    onClick={() => handleSelect(idx, option)}
                    className={`w-full py-3.5 px-4 rounded-xl font-medium text-left transition-all border text-sm sm:text-base flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{idx + 1}. {option}</span>
                    {selectedIdx === idx && feedback === 'correct' && <span>✓</span>}
                    {selectedIdx === idx && feedback === 'wrong' && <span>✕</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. 종료 화면 */}
        {status === 'gameover' && (
          <div className="text-center py-6 space-y-6">
            <div className="text-5xl">⏰</div>
            <h2 className="text-2xl font-black text-slate-200">타임 오버!</h2>

            <div className="bg-slate-900/80 rounded-2xl p-5 border border-slate-700 space-y-3">
              {isNewRecord && (
                <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 rounded-full text-xs font-bold animate-pulse">
                  🎉 신기록 달성!
                </div>
              )}
              <div className="text-slate-400 text-sm">최종 획득 점수</div>
              <div className="text-4xl font-extrabold text-emerald-400">{score}점</div>
              <div className="text-xs text-slate-400 pt-2 border-t border-slate-700/60 flex justify-between">
                <span>역대 최고 점수</span>
                <span className="font-bold text-yellow-400">{bestScore}점</span>
              </div>
            </div>

            <button
              onClick={startGame}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 text-lg"
            >
              🔄 다시 하기
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
