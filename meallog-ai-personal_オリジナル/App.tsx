import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getAdjustedDateLabel, MASCOT_NAME } from './constants';
import { MealLog, WeightLog, AppView, DailySummary, MealAnalysisResult, UserProfile, ChatMessage, HistoryMode } from './types';
import { analyzeMeal, chatWithMascot, generateWeightAdvice } from './services/geminiService';
import { Button } from './components/Button';
import { HistoryCard } from './components/HistoryCard';
import { CameraInput } from './components/CameraInput';
import { Onboarding } from './components/Onboarding';
import { Mascot, MascotFaceIcon } from './components/Mascot';
import { BottomNav } from './components/BottomNav';
import { NutritionChart } from './components/NutritionChart';
import { Plus, ChevronLeft, ChevronRight, Calendar, X, Send, Target, Settings as SettingsIcon, Trash2, Clock, MessageSquareQuote, CheckCircle, AlertCircle, Scale, PenLine, Utensils } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line } from 'recharts';

// New Component for Weight Card in List
const WeightCard: React.FC<{ log: WeightLog, onDelete: (id: string) => void, onClick: (log: WeightLog) => void }> = ({ log, onDelete, onClick }) => {
    return (
        <div 
            onClick={() => onClick(log)}
            className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
        >
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-yellow-50 flex items-center justify-center text-yellow-500 flex-shrink-0">
                    <Scale size={24} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800">{log.weight} <span className="text-xs font-normal text-gray-400">kg</span></div>
                    <div className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {new Date(log.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {log.advice && (
                        <div className="mt-1 text-xs text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-md inline-block max-w-full truncate">
                            {log.advice}
                        </div>
                    )}
                </div>
            </div>
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(log.id);
                }}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
            >
                <Trash2 size={18} />
            </button>
        </div>
    );
};

const App: React.FC = () => {
  // --- State ---
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [view, setView] = useState<AppView>(AppView.ONBOARDING);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Date & Calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  const [historyMode, setHistoryMode] = useState<HistoryMode>('daily');

  // Input Flow
  const [tempImage, setTempImage] = useState<string | undefined>(undefined);
  const [tempText, setTempText] = useState<string | undefined>(undefined);
  const [analysisResult, setAnalysisResult] = useState<MealAnalysisResult | null>(null);
  const [inputDateTime, setInputDateTime] = useState<string>(""); 

  // Weight Input Flow
  const [weightInput, setWeightInput] = useState("");
  const [weightDateInput, setWeightDateInput] = useState("");

  // FAB Menu
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);

  // Detail View
  const [selectedLog, setSelectedLog] = useState<MealLog | null>(null);
  const [selectedWeightLog, setSelectedWeightLog] = useState<WeightLog | null>(null);

  // Chat
  const [showChat, setShowChat] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Agentic Confirmation
  const [pendingToolCalls, setPendingToolCalls] = useState<{name: string, args: any}[] | null>(null);

  // --- Persistence ---
  useEffect(() => {
    try {
      const savedLogs = localStorage.getItem('meal_logs_v2');
      const savedWeightLogs = localStorage.getItem('weight_logs_v2');
      const savedProfile = localStorage.getItem('user_profile_v2');
      
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
        setView(AppView.HOME);
      } else {
        setView(AppView.ONBOARDING);
      }

      if (savedLogs) {
        setLogs(JSON.parse(savedLogs));
      }
      if (savedWeightLogs) {
        setWeightLogs(JSON.parse(savedWeightLogs));
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('meal_logs_v2', JSON.stringify(logs));
    } catch (e) {
      console.error("Storage full or error", e);
      // Fail silently or handle minimally to avoid spamming alerts
    }
  }, [logs]);

  useEffect(() => {
    try {
      localStorage.setItem('weight_logs_v2', JSON.stringify(weightLogs));
    } catch (e) {
      console.error("Storage full or error", e);
    }
  }, [weightLogs]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem('user_profile_v2', JSON.stringify(profile));
    }
  }, [profile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, showChat, pendingToolCalls]);

  // Initialize input date time
  useEffect(() => {
    if (analysisResult) {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
        setInputDateTime(localISOTime);
    }
  }, [analysisResult]);

  // Initialize weight date input
  useEffect(() => {
      if (view === AppView.WEIGHT_INPUT) {
          const now = new Date();
          const offset = now.getTimezoneOffset() * 60000;
          setWeightDateInput((new Date(now.getTime() - offset)).toISOString().slice(0, 16));
          if (profile) {
              setWeightInput(profile.currentWeight.toString());
          }
      }
  }, [view]);

  // --- Derived State ---
  const currentDateLabel = useMemo(() => getAdjustedDateLabel(currentDate), [currentDate]);
  
  const dailySummary: DailySummary = useMemo(() => {
    if (!profile) return { totalCalories: 0, totalP: 0, totalF: 0, totalC: 0, remainingCalories: 0, progress: 0 };
    
    const targetLogs = logs.filter(l => l.dateLabel === currentDateLabel);
    
    const totalCalories = Math.round(targetLogs.reduce((acc, l) => acc + l.calories, 0));
    const totalP = Math.round(targetLogs.reduce((acc, l) => acc + l.p, 0) * 10) / 10;
    const totalF = Math.round(targetLogs.reduce((acc, l) => acc + l.f, 0) * 10) / 10;
    const totalC = Math.round(targetLogs.reduce((acc, l) => acc + l.c, 0) * 10) / 10;
    
    const remaining = Math.max(0, profile.targetCalories - totalCalories);
    const progress = Math.min(100, (totalCalories / profile.targetCalories) * 100);

    return { totalCalories, totalP, totalF, totalC, remainingCalories: remaining, progress };
  }, [logs, currentDateLabel, profile]);

  const historyGraphData = useMemo(() => {
    if (historyMode === 'daily') return [];

    const data = [];
    if (historyMode === 'weekly') {
      const d = new Date(currentDate);
      const day = d.getDay(); 
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));

      for (let i = 0; i < 7; i++) {
        const temp = new Date(monday);
        temp.setDate(monday.getDate() + i);
        const label = getAdjustedDateLabel(temp);
        const dayLogs = logs.filter(l => l.dateLabel === label);
        const cals = Math.round(dayLogs.reduce((acc, l) => acc + l.calories, 0));
        data.push({
          date: label,
          label: temp.toLocaleDateString('ja-JP', { weekday: 'short' }),
          value: cals,
          target: profile?.targetCalories || 2000
        });
      }
    } else if (historyMode === 'monthly') {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      for(let i=1; i<=daysInMonth; i++) {
        const temp = new Date(year, month, i);
        const label = getAdjustedDateLabel(temp);
        const dayLogs = logs.filter(l => l.dateLabel === label);
        const cals = Math.round(dayLogs.reduce((acc, l) => acc + l.calories, 0));
        data.push({
          date: label,
          label: `${i}`,
          value: cals,
          target: profile?.targetCalories || 2000
        });
      }
    }
    return data;
  }, [logs, currentDate, historyMode, profile]);

  const historyAverage = useMemo(() => {
      if(historyGraphData.length === 0) return 0;
      const total = historyGraphData.reduce((acc, d) => acc + d.value, 0);
      return Math.round(total / historyGraphData.length);
  }, [historyGraphData]);

  const weeklyDataForHome = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label = getAdjustedDateLabel(d);
        const dayLogs = logs.filter(l => l.dateLabel === label);
        const cals = Math.round(dayLogs.reduce((acc, l) => acc + l.calories, 0));
        data.push({ 
            day: d.toLocaleDateString('ja-JP', { weekday: 'short' }), 
            cals 
        });
    }
    return data;
  }, [logs]);

  const weeklyWeightDataForHome = useMemo(() => {
    const data = [];
    const today = new Date();
    // Get last 7 days including today
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const label = getAdjustedDateLabel(d);
        // Find latest weight log for this day
        const dayLogs = weightLogs.filter(l => l.dateLabel === label);
        let weight: number | null = null;
        if (dayLogs.length > 0) {
            // Sort to get latest
            dayLogs.sort((a,b) => b.timestamp - a.timestamp);
            weight = dayLogs[0].weight;
        }
        data.push({
            day: d.toLocaleDateString('ja-JP', { weekday: 'short' }),
            weight: weight
        });
    }
    return data;
  }, [weightLogs]);

  // Generate data for Weight Graph (for history view)
  const weightGraphData = useMemo(() => {
      const sorted = [...weightLogs].sort((a,b) => a.timestamp - b.timestamp);
      let filtered = sorted;
      const targetDate = new Date(currentDate);

      if (historyMode === 'weekly') {
          const day = targetDate.getDay();
          const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(targetDate);
          monday.setDate(diff);
          monday.setHours(0,0,0,0);
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23,59,59,999);
          filtered = sorted.filter(l => l.timestamp >= monday.getTime() && l.timestamp <= sunday.getTime());
      } else if (historyMode === 'monthly') {
          const start = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1).getTime();
          const end = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59).getTime();
          filtered = sorted.filter(l => l.timestamp >= start && l.timestamp <= end);
      } 
      return filtered.map(l => ({
          date: new Date(l.timestamp).toLocaleDateString('ja-JP', {month: 'numeric', day: 'numeric'}),
          weight: l.weight
      }));
  }, [weightLogs, currentDate, historyMode]);

  // --- Handlers ---
  const handleOnboardingComplete = (newProfile: UserProfile, welcomeMessage: string) => {
    setProfile(newProfile);
    setView(AppView.HOME);
    setChatHistory([{ role: 'model', text: welcomeMessage, timestamp: Date.now() }]);
    setShowChat(true);
  };

  const handleStartLog = () => {
    setIsFabMenuOpen(false);
    setTempImage(undefined);
    setTempText(undefined);
    setAnalysisResult(null);
    setView(AppView.INPUT);
  };

  const handleStartWeight = () => {
    setIsFabMenuOpen(false);
    setView(AppView.WEIGHT_INPUT);
  }

  const handleAnalyze = async (input: { image?: string; text?: string }) => {
    if (input.image) setTempImage(`data:image/jpeg;base64,${input.image}`);
    if (input.text) setTempText(input.text);
    setIsLoading(true);
    try {
      const todayLogs = logs.filter(l => l.dateLabel === currentDateLabel);
      const result = await analyzeMeal(input, todayLogs);
      setAnalysisResult(result);
    } catch (e) {
      alert("分析に失敗しました。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveMeal = () => {
    if (!analysisResult) return;
    const timestamp = inputDateTime ? new Date(inputDateTime).getTime() : Date.now();
    const logDateObj = new Date(timestamp);
    const dateLabel = getAdjustedDateLabel(logDateObj);

    const newLog: MealLog = {
      ...analysisResult,
      id: Date.now().toString(),
      timestamp: timestamp,
      dateLabel: dateLabel,
      // IMPORTANT: Do NOT save image URL to save storage
      imageUrl: undefined, 
      memo: tempText
    };
    
    setLogs(prev => [newLog, ...prev]);
    setView(AppView.CALENDAR);
    setCurrentDate(logDateObj); 
  };

  const handleSaveWeight = async () => {
      if (!weightInput) return;
      const weightVal = parseFloat(weightInput);
      if (isNaN(weightVal)) return;

      setIsLoading(true);

      const timestamp = weightDateInput ? new Date(weightDateInput).getTime() : Date.now();
      let advice = "";
      try {
          const prevWeight = profile?.currentWeight || null;
          advice = await generateWeightAdvice(weightVal, prevWeight, profile?.targetWeight || 0);
      } catch (e) {
          advice = "記録しました。";
      }

      const newLog: WeightLog = {
          id: Date.now().toString(),
          weight: weightVal,
          timestamp: timestamp,
          dateLabel: getAdjustedDateLabel(new Date(timestamp)),
          advice: advice
      };

      setWeightLogs(prev => [...prev, newLog]);
      if (profile) {
          setProfile({...profile, currentWeight: weightVal});
      }
      setIsLoading(false);
      setView(AppView.CALENDAR);
      setCurrentDate(new Date(timestamp));
  };

  const handleDeleteWeight = (id: string) => {
      if(window.confirm("この記録を削除しますか？")) {
          setWeightLogs(prev => prev.filter(l => l.id !== id));
          if (selectedWeightLog && selectedWeightLog.id === id) {
              setSelectedWeightLog(null);
          }
      }
  };

  const handleChat = async () => {
    if (!chatInput.trim() || !profile) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    try {
        const response = await chatWithMascot(userMsg.text, profile, logs, weightLogs);
        
        if (response.text) {
             setChatHistory(prev => [...prev, { role: 'model', text: response.text, timestamp: Date.now() }]);
        }

        if (response.toolCalls && response.toolCalls.length > 0) {
            setPendingToolCalls(response.toolCalls);
        }

    } catch (e) {
        setChatHistory(prev => [...prev, { role: 'model', text: "ごめんね、ちょっと調子が悪いモグ...", timestamp: Date.now() }]);
    } finally {
        setIsChatLoading(false);
    }
  };

 const executeToolCalls = async () => {
  if (!pendingToolCalls || !profile) return;

  const calls = pendingToolCalls;
  setPendingToolCalls(null);

  let currentWeightForAdvice = profile.currentWeight ?? null;

  for (const { name, args } of calls) {
    if (name === 'add_meal_log') {
      const timestamp = new Date(args.date_iso).getTime();
      const newLog: MealLog = {
        id: Date.now().toString() + Math.random().toString(),
        item_name: args.item_name,
        calories: Math.round(args.calories),
        p: Math.round(args.p * 10) / 10,
        f: Math.round(args.f * 10) / 10,
        c: Math.round(args.c * 10) / 10,
        advice: args.advice || '手動追加',
        is_snack: args.is_snack !== undefined ? args.is_snack : false,
        timestamp: timestamp,
        dateLabel: getAdjustedDateLabel(new Date(timestamp))
      };
      setLogs(prev => [newLog, ...prev]);
      continue;
    }

    if (name === 'add_weight_log') {
      const timestamp = new Date(args.date_iso).getTime();
      const weightVal = typeof args.weight === 'number' ? args.weight : parseFloat(args.weight);

      let advice = '';
      try {
        advice = await generateWeightAdvice(weightVal, currentWeightForAdvice, profile.targetWeight || 0);
      } catch {
        advice = '記録しました。';
      }

      const newLog: WeightLog = {
        id: Date.now().toString() + Math.random().toString(),
        weight: weightVal,
        timestamp: timestamp,
        dateLabel: getAdjustedDateLabel(new Date(timestamp)),
        advice: advice
      };

      setWeightLogs(prev => [...prev, newLog]);
      setProfile(prev => (prev ? { ...prev, currentWeight: weightVal } : null));
      currentWeightForAdvice = weightVal;
      continue;
    }

    if (name === 'update_user_profile') {
      setProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          targetWeight: args.targetWeight || prev.targetWeight,
          targetCalories: args.targetCalories || prev.targetCalories
        };
      });
      continue;
    }
  }

  setChatHistory(prev => [...prev, { role: 'model', text: `記録したモグ！`, timestamp: Date.now() }]);
};


  const cancelToolCalls = () => {
      setPendingToolCalls(null);
      setChatHistory(prev => [...prev, { role: 'model', text: `変更をやめたモグ。`, timestamp: Date.now() }]);
  };

  const handleDeleteLog = (id: string) => {
      if(window.confirm("この記録を削除しますか？")) {
          setLogs(prev => prev.filter(l => l.id !== id));
          if (selectedLog && selectedLog.id === id) {
              setSelectedLog(null);
          }
      }
  };

  // Fixed Reset Logic
  const handleResetData = () => {
      if(window.confirm("全てのデータを削除して初期状態に戻しますか？\nこの操作は取り消せません。")) {
          // Clear Storage
          localStorage.removeItem('meal_logs_v2');
          localStorage.removeItem('weight_logs_v2');
          localStorage.removeItem('user_profile_v2');
          
          // Reset State explicitly
          setLogs([]);
          setWeightLogs([]);
          setProfile(null);
          setView(AppView.ONBOARDING);
      }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(e.target.value) {
          setCurrentDate(new Date(e.target.value));
      }
  }

  const shiftDate = (direction: -1 | 1) => {
      const newDate = new Date(currentDate);
      if (historyMode === 'daily') {
          newDate.setDate(newDate.getDate() + direction);
      } else if (historyMode === 'weekly') {
          newDate.setDate(newDate.getDate() + (direction * 7));
      } else if (historyMode === 'monthly') {
          newDate.setMonth(newDate.getMonth() + direction);
      }
      setCurrentDate(newDate);
  }

  const mascotMessage = useMemo(() => {
      if (!profile) return "";
      
      const { progress, remainingCalories, totalP } = dailySummary;
      const hours = new Date().getHours();

      if (remainingCalories < 0) {
          return `カロリーオーバーだモグ...\n明日は少し控えめにするモグ！`;
      }
      
      if (hours >= 20) {
          if (progress < 80) return `今日は少しカロリーが足りないモグ。\n無理せず栄養摂るモグよ。`;
          return `今日もお疲れ様だモグ！\nゆっくり休むモグ。`;
      }

      if (hours < 10 && progress < 30) {
          return `おはようモグ！\n今日も1日頑張るモグ！`;
      }

      if (progress > 80) {
          return `目標まであと${remainingCalories}kcalだモグ！\nこの調子だモグ！`;
      }
      
      if (progress > 50 && totalP < profile.targetP * 0.4) {
          return `タンパク質がちょっと足りないモグ。\nお肉や魚、豆を食べるモグ！`;
      }

      return `何か食べたら教えてほしいモグ！\n計算するモグよ！`;
  }, [dailySummary, profile]);

  // --- Views ---

  if (view === AppView.ONBOARDING) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Weight Input View
  if (view === AppView.WEIGHT_INPUT) {
      if (isLoading) {
          return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
              <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-6"></div>
              <p className="text-gray-500 font-bold">AIがアドバイスを考え中...</p>
            </div>
          );
      }
      return (
        <div className="min-h-screen bg-yellow-50 max-w-md mx-auto flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
                <h2 className="text-lg font-bold text-gray-800">体重を記録</h2>
                <button onClick={() => setView(AppView.HOME)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
                    <X size={24} />
                </button>
            </div>
            <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-8">
                <div className="w-full bg-white p-8 rounded-3xl shadow-sm text-center">
                     <label className="block text-sm font-bold text-gray-400 mb-2">体重</label>
                     <div className="flex items-end justify-center gap-2">
                        <input 
                            type="number" 
                            value={weightInput} 
                            onChange={(e) => setWeightInput(e.target.value)}
                            className="w-40 text-center text-5xl font-bold text-gray-800 border-b-2 border-yellow-200 focus:border-yellow-500 outline-none bg-transparent"
                            placeholder="0.0"
                            autoFocus
                        />
                        <span className="text-xl font-bold text-gray-400 mb-2">kg</span>
                     </div>
                </div>

                <div className="w-full">
                    <label className="block text-xs font-bold text-gray-500 mb-2 ml-1">計測日時</label>
                    <input 
                        type="datetime-local" 
                        value={weightDateInput}
                        onChange={(e) => setWeightDateInput(e.target.value)}
                        className="w-full bg-white p-4 rounded-xl text-gray-800 font-bold text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                    />
                </div>
            </div>
            <div className="p-4 bg-white border-t sticky bottom-0">
                <Button 
                    onClick={handleSaveWeight} 
                    disabled={!weightInput}
                    className="bg-yellow-400 hover:bg-yellow-500 shadow-yellow-200 text-white"
                >
                    保存する
                </Button>
            </div>
        </div>
      );
  }

  // Meal Input View
  if (view === AppView.INPUT) {
    if (isLoading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
          <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-6"></div>
          <p className="text-gray-500 font-bold">AIが分析中...</p>
        </div>
      );
    }
    if (analysisResult) {
       return (
        <div className="min-h-screen bg-sky-50 pb-20 max-w-md mx-auto flex flex-col">
            <div className="bg-white p-6 rounded-b-3xl shadow-sm overflow-y-auto flex-1">
                <div className="mb-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{analysisResult.item_name}</h2>
                        <span className="text-sky-500 font-bold text-xl">{Math.round(analysisResult.calories)} kcal</span>
                    </div>
                    {analysisResult.is_snack && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-lg font-bold">おやつ</span>}
                </div>
                
                <div className="bg-sky-50 border border-sky-100 p-4 rounded-2xl mb-6 relative">
                    <div className="absolute -top-3 left-4 bg-sky-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">AIアドバイス</div>
                    <p className="text-sky-900 text-sm leading-relaxed mt-2">{analysisResult.advice}</p>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                        { l: 'P', v: analysisResult.p, n: 'タンパク質' },
                        { l: 'F', v: analysisResult.f, n: '脂質' },
                        { l: 'C', v: analysisResult.c, n: '炭水化物' }
                    ].map((item) => (
                        <div key={item.l} className="bg-gray-100 rounded-xl p-3 text-center">
                            <span className="block text-xl font-bold text-gray-800">{Math.round(item.v * 10) / 10}<span className="text-xs text-gray-400 font-normal">g</span></span>
                            <span className="text-[10px] text-gray-500">{item.n}</span>
                        </div>
                    ))}
                </div>

                <div className="mb-6">
                    <label className="block text-xs font-bold text-gray-500 mb-2">日時設定</label>
                    <input 
                        type="datetime-local"
                        value={inputDateTime}
                        onChange={(e) => setInputDateTime(e.target.value)}
                        className="w-full bg-gray-100 p-3 rounded-xl text-gray-800 font-bold text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                </div>
            </div>
            <div className="p-4 bg-white border-t space-y-3">
                <Button onClick={handleSaveMeal}>記録する</Button>
                <Button variant="ghost" onClick={() => setAnalysisResult(null)}>やり直す</Button>
            </div>
        </div>
       );
    }
    return <div className="bg-white min-h-screen"><CameraInput onAnalyze={handleAnalyze} onCancel={() => setView(AppView.HOME)} /></div>;
  }

  // Common Layout for Home/Calendar
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-24 max-w-md mx-auto relative shadow-2xl text-gray-900">
      
      {/* --- HOME VIEW --- */}
      {view === AppView.HOME && profile && (
          <div className="p-6 space-y-6">
              <header className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.name}さん</h1>
                    <div className="text-gray-400 text-xs flex items-center gap-1">
                        <span>現在 {profile.currentWeight}kg / 目標 {profile.targetWeight}kg</span>
                    </div>
                  </div>
                  <button onClick={() => setView(AppView.SETTINGS)} className="p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-sky-500">
                    <SettingsIcon size={20} />
                  </button>
              </header>

              <div className="bg-gradient-to-br from-sky-400 to-sky-600 text-white rounded-3xl p-6 shadow-xl shadow-sky-200 relative overflow-hidden">
                <div className="relative z-10">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-sky-100 text-xs font-bold uppercase">Today's Balance</span>
                        <span className="text-white font-bold">{Math.round(dailySummary.totalCalories)} / {profile.targetCalories} kcal</span>
                    </div>
                    <div className="h-4 bg-black/10 rounded-full overflow-hidden mb-6">
                        <div className={`h-full rounded-full transition-all duration-1000 ${dailySummary.progress > 100 ? 'bg-red-400' : 'bg-yellow-300'}`} style={{ width: `${dailySummary.progress}%` }}></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-lg font-bold">{dailySummary.totalP} <span className="text-xs text-sky-100">/ {profile.targetP}</span></div>
                            <div className="text-[10px] text-sky-100">Protein</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold">{dailySummary.totalF} <span className="text-xs text-sky-100">/ {profile.targetF}</span></div>
                            <div className="text-[10px] text-sky-100">Fat</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold">{dailySummary.totalC} <span className="text-xs text-sky-100">/ {profile.targetC}</span></div>
                            <div className="text-[10px] text-sky-100">Carbs</div>
                        </div>
                    </div>
                </div>
              </div>

              <div className="py-4">
                <Mascot message={mascotMessage} onClick={() => setShowChat(true)} />
                <p className="text-center text-xs text-gray-400 mt-2">タップして{MASCOT_NAME}と話す</p>
              </div>

              <div className="space-y-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><Target size={16} className="text-sky-500"/> 今週のカロリー推移</h3>
                    <div className="h-40 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyDataForHome}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}} 
                                    contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#333', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                />
                                <Bar dataKey="cals" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white p-5 rounded-3xl shadow-sm">
                    <h3 className="font-bold text-gray-800 mb-4 text-sm flex items-center gap-2"><Scale size={16} className="text-yellow-500"/> 今週の体重推移</h3>
                    <div className="h-40 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyWeightDataForHome}>
                                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                                <YAxis hide domain={['auto', 'auto']} />
                                <Tooltip 
                                    contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#333', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                />
                                <Line type="monotone" dataKey="weight" stroke="#facc15" strokeWidth={3} dot={{r:3}} connectNulls />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- RECORD (Unified History) VIEW --- */}
      {view === AppView.CALENDAR && (
          <div className="p-6 min-h-screen flex flex-col">
              <header className="mb-6 space-y-4">
                <div className="flex justify-between items-center">
                     <h2 className="text-xl font-bold text-gray-900">記録</h2>
                     
                     <div className="bg-gray-200 p-1 rounded-lg flex text-xs font-bold">
                        <button 
                            onClick={() => setHistoryMode('daily')}
                            className={`px-3 py-1.5 rounded-md transition-all ${historyMode === 'daily' ? 'bg-white text-sky-500 shadow-sm' : 'text-gray-500'}`}
                        >日</button>
                        <button 
                            onClick={() => setHistoryMode('weekly')}
                            className={`px-3 py-1.5 rounded-md transition-all ${historyMode === 'weekly' ? 'bg-white text-sky-500 shadow-sm' : 'text-gray-500'}`}
                        >週</button>
                        <button 
                            onClick={() => setHistoryMode('monthly')}
                            className={`px-3 py-1.5 rounded-md transition-all ${historyMode === 'monthly' ? 'bg-white text-sky-500 shadow-sm' : 'text-gray-500'}`}
                        >月</button>
                     </div>
                </div>

                <div className="flex justify-between items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
                    <button onClick={() => shiftDate(-1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ChevronLeft size={20}/></button>
                    
                    <div className="relative">
                        <div className="flex flex-col items-center">
                             <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                 <Calendar size={14} className="text-sky-500"/>
                                 {historyMode === 'daily' && currentDate.toLocaleDateString('ja-JP', {year: 'numeric', month: 'long', day: 'numeric'})}
                                 {historyMode === 'weekly' && `${currentDate.getMonth()+1}月 第${Math.floor((currentDate.getDate()-1)/7)+1}週`}
                                 {historyMode === 'monthly' && currentDate.toLocaleDateString('ja-JP', {year: 'numeric', month: 'long'})}
                             </div>
                        </div>
                        <input 
                            type="date" 
                            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                            onChange={handleDateChange}
                        />
                    </div>

                    <button onClick={() => shiftDate(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><ChevronRight size={20}/></button>
                </div>
              </header>
              
              <div className="flex-1 space-y-6">
                  {/* Daily Mode View */}
                  {historyMode === 'daily' && (
                    <>
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                           <div className="flex justify-between items-end mb-4 px-2">
                               <h3 className="text-sm font-bold text-gray-400 uppercase">PFC Balance</h3>
                               <div className="text-right">
                                    <span className="text-xs text-gray-400 mr-1">Total</span>
                                    <span className="font-bold text-xl text-gray-800">{Math.round(dailySummary.totalCalories)}</span>
                                    <span className="text-xs text-gray-400 ml-1">kcal</span>
                               </div>
                           </div>
                           
                           <NutritionChart p={dailySummary.totalP} f={dailySummary.totalF} c={dailySummary.totalC} />
                           
                           <div className="grid grid-cols-3 w-full mt-4 text-center divide-x divide-gray-100">
                               <div><div className="font-bold text-lg text-yellow-500">{dailySummary.totalP}g</div><div className="text-[10px] text-gray-400 font-bold">Protein</div></div>
                               <div><div className="font-bold text-lg text-gray-400">{dailySummary.totalF}g</div><div className="text-[10px] text-gray-400 font-bold">Fat</div></div>
                               <div><div className="font-bold text-lg text-sky-400">{dailySummary.totalC}g</div><div className="text-[10px] text-gray-400 font-bold">Carbs</div></div>
                           </div>
                      </div>

                      <div>
                         <h3 className="text-sm font-bold text-gray-700 mb-3 ml-2">本日のタイムライン</h3>
                         <div className="space-y-3">
                             {/* Combine and Sort Logs */}
                             {(() => {
                                 const dayMeals = logs.filter(l => l.dateLabel === currentDateLabel);
                                 const dayWeights = weightLogs.filter(l => l.dateLabel === currentDateLabel);
                                 const combined = [...dayMeals, ...dayWeights].sort((a, b) => b.timestamp - a.timestamp);

                                 if (combined.length === 0) {
                                     return (
                                         <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                                             <p>記録がありません</p>
                                         </div>
                                     );
                                 }

                                 return combined.map(item => {
                                     // Check if it's a weight log (has 'weight' property)
                                     if ('weight' in item) {
                                         return <WeightCard key={item.id} log={item as WeightLog} onDelete={handleDeleteWeight} onClick={setSelectedWeightLog} />;
                                     } else {
                                         return <HistoryCard key={item.id} log={item as MealLog} onDelete={handleDeleteLog} onClick={setSelectedLog} />;
                                     }
                                 });
                             })()}
                         </div>
                     </div>
                    </>
                  )}

                  {/* Weekly/Monthly View */}
                  {historyMode !== 'daily' && (
                    <>
                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 h-64">
                          <div className="flex justify-between mb-4">
                              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                  摂取カロリー
                              </h3>
                              <span className="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded-md font-bold">Avg: {historyAverage} kcal</span>
                          </div>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={historyGraphData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} interval={historyMode === 'monthly' ? 4 : 0} />
                                <YAxis hide />
                                <Tooltip 
                                    cursor={{fill: '#f3f4f6'}}
                                    contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#333', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                />
                                <Bar dataKey="value" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={historyMode === 'monthly' ? 6 : 24} />
                            </BarChart>
                          </ResponsiveContainer>
                      </div>

                      <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 h-64">
                          <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                              体重推移
                          </h3>
                          {weightGraphData.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={weightGraphData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 10}} interval="preserveStartEnd" />
                                    <YAxis domain={['auto', 'auto']} hide />
                                    <Tooltip 
                                        cursor={{stroke: '#facc15', strokeWidth: 1}}
                                        contentStyle={{borderRadius: '8px', border: 'none', backgroundColor: '#fff', color: '#333', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} 
                                    />
                                    <Line type="monotone" dataKey="weight" stroke="#facc15" strokeWidth={3} dot={{fill: '#facc15', r: 4}} activeDot={{r: 6}} connectNulls />
                                </LineChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">データがありません</div>
                          )}
                      </div>
                    </>
                  )}
              </div>
          </div>
      )}

      {/* --- SETTINGS VIEW --- */}
      {view === AppView.SETTINGS && profile && (
         <div className="p-6">
            <h2 className="text-xl font-bold mb-6 text-gray-900">設定</h2>
            <div className="bg-white rounded-2xl p-6 space-y-6 shadow-sm border border-gray-100">
                <div>
                    <label className="text-xs text-gray-400 block mb-2 font-bold">ニックネーム</label>
                    <input 
                        type="text"
                        value={profile.name}
                        onChange={(e) => setProfile({...profile, name: e.target.value})}
                        className="w-full p-3 bg-gray-50 rounded-xl font-bold text-gray-900 border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-xs text-gray-400 block mb-2 font-bold">目標カロリー</label>
                        <input type="number" value={profile.targetCalories} onChange={e => setProfile({...profile, targetCalories: Number(e.target.value)})} className="bg-gray-50 p-3 rounded-xl w-full font-bold text-gray-900 border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 block mb-2 font-bold">目標体重</label>
                        <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: Number(e.target.value)})} className="bg-gray-50 p-3 rounded-xl w-full font-bold text-gray-900 border border-gray-200 focus:ring-2 focus:ring-sky-500 outline-none" />
                    </div>
                </div>
                <div className="pt-6 border-t">
                    <Button variant="danger" onClick={handleResetData}>データリセット</Button>
                </div>
            </div>
         </div>
      )}

      {/* Floating Action Button with Menu */}
      <div className="fixed bottom-24 right-6 z-20 flex flex-col items-end gap-3 pointer-events-none">
        {isFabMenuOpen && (
            <>
                <button 
                    onClick={handleStartWeight}
                    className="pointer-events-auto bg-white text-gray-700 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in-up hover:bg-gray-50 font-bold text-sm"
                >
                    <Scale size={18} className="text-yellow-500" />
                    体重を追加
                </button>
                <button 
                    onClick={handleStartLog}
                    className="pointer-events-auto bg-white text-gray-700 px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in-up hover:bg-gray-50 font-bold text-sm"
                >
                    <Utensils size={18} className="text-sky-500" />
                    食事を追加
                </button>
            </>
        )}
        
        <button 
            onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            className={`pointer-events-auto w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isFabMenuOpen ? 'bg-gray-800 rotate-45' : 'bg-sky-400 hover:bg-sky-500 hover:scale-105'}`}
        >
            <Plus size={28} className="text-white" />
        </button>
      </div>

      <BottomNav currentView={view} onChange={setView} />

      {/* Detail Modal for MealLog */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedLog(null)}>
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="p-6 border-b border-gray-100 relative bg-white">
                   <div className="pr-8">
                       <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedLog.item_name}</h2>
                       <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock size={12}/> {new Date(selectedLog.timestamp).toLocaleString('ja-JP')}
                            </span>
                            {selectedLog.is_snack && <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full font-bold">おやつ</span>}
                       </div>
                   </div>
                   <button onClick={() => setSelectedLog(null)} className="absolute top-6 right-6 bg-gray-100 text-gray-500 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
               </div>
               
               <div className="p-6">
                   <div className="flex items-center gap-2 mb-6">
                       <span className="text-sky-500 font-bold text-3xl">{Math.round(selectedLog.calories)}</span>
                       <span className="text-gray-400 text-sm font-bold pt-2">kcal</span>
                   </div>

                   <div className="bg-sky-50 p-4 rounded-xl border border-sky-100 mb-6">
                       <p className="text-sm text-sky-800 leading-relaxed font-medium">{selectedLog.advice}</p>
                   </div>

                   <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <span className="block font-bold text-gray-800 text-lg">{Math.round(selectedLog.p * 10)/10}g</span>
                            <span className="text-[10px] text-gray-400 font-bold">Protein</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <span className="block font-bold text-gray-800 text-lg">{Math.round(selectedLog.f * 10)/10}g</span>
                            <span className="text-[10px] text-gray-400 font-bold">Fat</span>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-xl text-center">
                            <span className="block font-bold text-gray-800 text-lg">{Math.round(selectedLog.c * 10)/10}g</span>
                            <span className="text-[10px] text-gray-400 font-bold">Carbs</span>
                        </div>
                   </div>

                   {selectedLog.memo && (
                       <div className="mb-6 p-3 bg-gray-50 rounded-xl text-sm text-gray-600 border border-gray-100">
                           <span className="block text-xs font-bold text-gray-400 mb-1">メモ</span>
                           {selectedLog.memo}
                       </div>
                   )}

                   <Button variant="danger" onClick={() => handleDeleteLog(selectedLog.id)} className="w-full flex items-center justify-center gap-2">
                       <Trash2 size={18} /> 記録を削除
                   </Button>
               </div>
           </div>
        </div>
      )}

      {/* Detail Modal for WeightLog */}
      {selectedWeightLog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedWeightLog(null)}>
           <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
               <div className="bg-yellow-50 p-6 flex flex-col items-center justify-center relative border-b border-yellow-100">
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-2 text-yellow-500">
                       <Scale size={32} />
                   </div>
                   <h2 className="text-3xl font-bold text-gray-800">{selectedWeightLog.weight}<span className="text-lg text-gray-500 font-normal ml-1">kg</span></h2>
                   <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <Clock size={12}/> {new Date(selectedWeightLog.timestamp).toLocaleString('ja-JP')}
                   </div>
                   <button onClick={() => setSelectedWeightLog(null)} className="absolute top-4 right-4 bg-black/10 text-gray-500 p-2 rounded-full hover:bg-black/20"><X size={20}/></button>
               </div>
               <div className="p-6">
                   <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 mb-6">
                       <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full mb-2 inline-block">AIアドバイス</span>
                       <p className="text-sm text-yellow-900 leading-relaxed font-medium">{selectedWeightLog.advice}</p>
                   </div>

                   <Button variant="danger" onClick={() => handleDeleteWeight(selectedWeightLog.id)} className="w-full flex items-center justify-center gap-2">
                       <Trash2 size={18} /> 記録を削除
                   </Button>
               </div>
           </div>
        </div>
      )}

      {/* Chat Modal */}
      {showChat && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
              <div className="bg-white w-full h-[80vh] sm:h-[600px] sm:max-w-md rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl text-gray-900 overflow-hidden relative">
                  <div className="p-4 border-b flex justify-between items-center bg-sky-50 rounded-t-3xl">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-yellow-100">
                            <MascotFaceIcon size={32} />
                        </div>
                        <span className="font-bold text-sky-800">{MASCOT_NAME}</span>
                      </div>
                      <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/50 rounded-full"><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 pb-20">
                     {chatHistory.length === 0 && (
                         <div className="text-center text-gray-400 text-sm mt-10">何でも聞いてほしいモグ！</div>
                     )}
                     {chatHistory.map((msg, i) => (
                         <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                             <div className={`max-w-[80%] p-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                                 msg.role === 'user' 
                                 ? 'bg-sky-400 text-white rounded-tr-none' 
                                 : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                             }`}>
                                 {msg.text}
                             </div>
                         </div>
                     ))}
                     {isChatLoading && <div className="text-gray-400 text-xs ml-4">入力中...</div>}

                     {/* Tool Call Confirmation Bubble */}
                     {pendingToolCalls && (
                         <div className="flex justify-start w-full">
                             <div className="max-w-[85%] bg-white border-2 border-sky-400 rounded-2xl rounded-tl-none p-4 shadow-lg animate-pulse-soft">
                                <div className="flex items-start gap-3 mb-2">
                                    <AlertCircle className="text-sky-500 shrink-0" size={20} />
                                    <span className="font-bold text-gray-800 text-sm">確認だモグ</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-4 whitespace-pre-wrap">
                                    以下を記録してもいいモグか？<br/><br/>
                                    {pendingToolCalls.map((call, idx) => (
                                        <span key={idx} className="block mb-2">
                                            {call.name === 'add_meal_log' && (
                                                <>
                                                    🍽️ <b>{call.args.item_name}</b> ({Math.round(call.args.calories)}kcal)
                                                </>
                                            )}
                                            {call.name === 'add_weight_log' && (
                                                <>
                                                    ⚖️ <b>{call.args.weight}kg</b>
                                                </>
                                            )}
                                            {call.name === 'update_user_profile' && (
                                                <>
                                                    🎯 目標更新
                                                </>
                                            )}
                                        </span>
                                    ))}
                                </p>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={executeToolCalls}
                                        className="flex-1 bg-sky-400 text-white py-2 rounded-lg text-xs font-bold hover:bg-sky-500 flex items-center justify-center gap-1"
                                    >
                                        <CheckCircle size={14} /> はい
                                    </button>
                                    <button 
                                        onClick={cancelToolCalls}
                                        className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-bold hover:bg-gray-200"
                                    >
                                        いいえ
                                    </button>
                                </div>
                             </div>
                         </div>
                     )}

                     <div ref={chatEndRef} />
                  </div>
                  <div className="p-4 border-t bg-white absolute bottom-0 w-full">
                      <div className="flex gap-2">
                          <input 
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleChat()}
                            placeholder="メッセージを入力..."
                            disabled={!!pendingToolCalls}
                            className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none focus:ring-2 focus:ring-sky-500 text-gray-900 disabled:opacity-50"
                          />
                          <button onClick={handleChat} disabled={!chatInput.trim() || isChatLoading || !!pendingToolCalls} className="bg-sky-400 text-white p-3 rounded-full hover:bg-sky-500 disabled:opacity-50">
                              <Send size={20} />
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default App;
