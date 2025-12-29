
export interface MealAnalysisResult {
  item_name: string;
  calories: number;
  p: number; // Protein
  f: number; // Fat
  c: number; // Carbs
  advice: string;
  is_snack: boolean;
}

export interface MealLog extends MealAnalysisResult {
  id: string;
  timestamp: number; // Unix timestamp
  dateLabel: string; // YYYY-MM-DD
  imageUrl?: string;
  memo?: string;
}

export interface WeightLog {
  id: string;
  weight: number;
  timestamp: number;
  dateLabel: string;
  advice?: string; // Added advice for weight
}

export interface UserProfile {
  name: string;
  currentWeight: number;
  targetWeight: number;
  targetDurationMonths: number; // How many months to achieve goal
  targetCalories: number;
  targetP: number;
  targetF: number;
  targetC: number;
  onboardingCompleted: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppView {
  ONBOARDING = 'ONBOARDING',
  HOME = 'HOME',
  CALENDAR = 'CALENDAR',
  INPUT = 'INPUT',
  WEIGHT_INPUT = 'WEIGHT_INPUT', // Added new view
  SETTINGS = 'SETTINGS'
}

export type HistoryMode = 'daily' | 'weekly' | 'monthly';
export type HistoryTab = 'meal' | 'weight';

export interface DailySummary {
  totalCalories: number;
  totalP: number;
  totalF: number;
  totalC: number;
  remainingCalories: number;
  progress: number;
}
