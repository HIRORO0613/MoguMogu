import React, { useState } from 'react';
import { Mascot } from './Mascot';
import { Button } from './Button';
import { UserProfile } from '../types';
import { generateDietPlan } from '../services/geminiService';

interface OnboardingProps {
  onComplete: (profile: UserProfile, message: string) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [duration, setDuration] = useState('3');
  const [isLoading, setIsLoading] = useState(false);

  const handleNext = () => {
    if (step === 0 && !name) return;
    if (step === 1 && !currentWeight) return;
    if (step === 2 && !targetWeight) return;
    
    if (step === 3) {
      calculatePlan();
    } else {
      setStep(s => s + 1);
    }
  };

  const calculatePlan = async () => {
    setIsLoading(true);
    try {
      const plan = await generateDietPlan(Number(currentWeight), Number(targetWeight), Number(duration));
      
      const profile: UserProfile = {
        name,
        currentWeight: Number(currentWeight),
        targetWeight: Number(targetWeight),
        targetDurationMonths: Number(duration),
        targetCalories: plan.targetCalories,
        targetP: plan.targetP,
        targetF: plan.targetF,
        targetC: plan.targetC,
        onboardingCompleted: true
      };
      
      onComplete(profile, plan.message);
    } catch (e: any) {
      console.error(e);
      alert(`プラン作成エラー: ${e?.message ?? String(e)}`);
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch(step) {
      case 0:
        return (
          <div className="space-y-4">
            <Mascot message="はじめましてだモグ！僕はモグちゃん。君のダイエットをサポートするモグ！まずはニックネームを教えてほしいモグ。" />
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              placeholder="ニックネーム"
              className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-400 outline-none text-gray-900 placeholder-gray-400 bg-white"
            />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <Mascot message={`${name}さん、よろしくモグ！今の体重は何キロぐらいモグ？`} />
            <div className="flex items-center gap-2">
                <input 
                type="number" 
                value={currentWeight} 
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="0.0"
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-400 outline-none text-gray-900 placeholder-gray-400 bg-white"
                />
                <span className="font-bold text-gray-500">kg</span>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <Mascot message="なるほどモグ。じゃあ、目標の体重は何キロを目指すモグ？" />
            <div className="flex items-center gap-2">
                <input 
                type="number" 
                value={targetWeight} 
                onChange={(e) => setTargetWeight(e.target.value)}
                placeholder="0.0"
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-400 outline-none text-gray-900 placeholder-gray-400 bg-white"
                />
                <span className="font-bold text-gray-500">kg</span>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <Mascot message="最後に、それを何ヶ月くらいで達成したいモグ？無理のない範囲がいいモグよ。" />
            <div className="flex items-center gap-2">
                <input 
                type="number" 
                value={duration} 
                onChange={(e) => setDuration(e.target.value)}
                placeholder="3"
                className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-sky-400 outline-none text-gray-900 placeholder-gray-400 bg-white"
                />
                <span className="font-bold text-gray-500">ヶ月</span>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-6 rounded-3xl shadow-xl space-y-8">
        <h1 className="text-xl font-bold text-center text-gray-900">初期設定V2</h1>
        
        {renderContent()}

        <Button onClick={handleNext} isLoading={isLoading}>
          {step === 3 ? "プランを作成する" : "次へ"}
        </Button>
      </div>
    </div>
  );
};
