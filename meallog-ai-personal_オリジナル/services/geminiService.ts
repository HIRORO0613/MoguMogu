import { GoogleGenAI, Type, Schema, FunctionDeclaration } from "@google/genai";
import { SYSTEM_INSTRUCTION, MASCOT_INSTRUCTION } from "../constants";
import { MealAnalysisResult, UserProfile, MealLog, WeightLog } from "../types";

const getAiClient = () => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) throw new Error("VITE_API_KEY is missing");
  return new GoogleGenAI({ apiKey });
};

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite","gemma-3-27b"];

const isRetryableError = (e: any) => {
  const msg = String(e?.message ?? e ?? "");
  const status = Number(e?.status ?? e?.code ?? 0);
  const statusText = String(e?.statusText ?? "");

  const lower = (msg + " " + statusText).toLowerCase();

  if (status === 429) return true;
  if (status === 500 || status === 503 || status === 504 || status === 408) return true;

  return (
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("429") ||
    lower.includes("rate limit") ||
    lower.includes("quota") ||
    lower.includes("too many requests") ||
    lower.includes("internal") ||
    lower.includes("unavailable") ||
    lower.includes("timeout") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror")
  );
};

const formatErrorShort = (e: any) => {
  const status = e?.status ?? e?.code ?? "";
  const message = String(e?.message ?? e ?? "");
  const s = status ? `status=${status}` : "status=?";
  return `${s} ${message}`.slice(0, 180);
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const generateContentWithFallback = async (ai: any, req: any, models: string[]) => {
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await ai.models.generateContent({ ...req, model });
        return { response, usedModel: model, fallbackUsed: i > 0, attempts: attempt + 1 };
      } catch (e: any) {
        lastError = e;
        if (!isRetryableError(e)) throw e;
        if (attempt === 0) await sleep(600);
      }
    }
  }

  throw lastError;
};


// --- Meal Analysis ---


// --- Meal Analysis ---

const mealSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    item_name: { type: Type.STRING, description: "料理名" },
    calories: { type: Type.NUMBER, description: "推定カロリー (kcal)" },
    p: { type: Type.NUMBER, description: "タンパク質 (g)" },
    f: { type: Type.NUMBER, description: "脂質 (g)" },
    c: { type: Type.NUMBER, description: "炭水化物 (g)" },
    advice: { type: Type.STRING, description: "具体的なアドバイス (100文字程度)" },
    is_snack: { type: Type.BOOLEAN, description: "間食かどうか" },
  },
  required: ["item_name", "calories", "p", "f", "c", "advice", "is_snack"],
};

export const analyzeMeal = async (
  input: { image?: string; text?: string }, 
  recentLogs: MealLog[] = []
): Promise<MealAnalysisResult> => {
  const ai = getAiClient();
  //const modelId = "gemini-3-flash-preview"; 

  const parts: any[] = [];
  
  // Create context from recent logs
  let contextText = "";
  if (recentLogs.length > 0) {
    const history = recentLogs.map(l => `- ${l.item_name} (${l.calories}kcal, P:${l.p}g, F:${l.f}g, C:${l.c}g)`).join("\n");
    contextText = `
    【重要: 文脈情報】
    このユーザーが今日すでに食べたものは以下の通りです。
    この履歴を踏まえて、栄養バランスの過不足（例：昼が高脂質だったので夜は控えめに、等）を考慮したアドバイスを生成してください。
    
    今日の食事履歴:
    ${history}
    `;
  }

  if (input.image) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: input.image } });
  }
  if (input.text) {
    parts.push({ text: `食事内容の説明: ${input.text}` });
  }
  
  parts.push({ text: `${contextText}\nこの食事を分析してください。` });

  const { response } = await generateContentWithFallback(
   ai,
   {
     contents: { parts },
     config: {
       systemInstruction: SYSTEM_INSTRUCTION,
       responseMimeType: "application/json",
       responseSchema: mealSchema
     }
   },
   [PRIMARY_MODEL, ...FALLBACK_MODELS]
 );


  const text = response.text;
  if (!text) throw new Error("No response");
  return JSON.parse(text) as MealAnalysisResult;
};

// --- Weight Analysis (Advice) ---

const weightAdviceSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        advice: { type: Type.STRING, description: "体重記録に対するフィードバック（100文字程度）。丁寧な「〜です」「〜ます」調。" }
    },
    required: ["advice"]
};

export const generateWeightAdvice = async (
    currentWeight: number,
    previousWeight: number | null,
    targetWeight: number
): Promise<string> => {
    const ai = getAiClient();
    const diff = previousWeight ? currentWeight - previousWeight : 0;
    const diffStr = diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`;
    
    const prompt = `
    現在の体重: ${currentWeight}kg
    前回との差: ${previousWeight ? diffStr : '初回記録'}
    目標体重: ${targetWeight}kg

    この体重記録に対して、管理栄養士のような視点で100文字程度のアドバイスをしてください。
    
    【重要：口調のルール】
    - キャラクター語尾（〜モグなど）は禁止です。
    - 「〜です」「〜ます」を用いた、丁寧で客観的な日本語にしてください。
    
    【内容のルール】
    - 単なる数字の報告だけでなく、次へのアクションや励ましを含めてください。
    - 増減に一喜一憂しすぎず、長期的な健康管理を促してください。
    `;

    // Use SYSTEM_INSTRUCTION (Nutritionist role) instead of MASCOT_INSTRUCTION
    const { response } = await generateContentWithFallback(
     ai,
     {
       contents: prompt,
       config: {
         systemInstruction: SYSTEM_INSTRUCTION,
         responseMimeType: "application/json",
         responseSchema: weightAdviceSchema
       }
     },
     [PRIMARY_MODEL, ...FALLBACK_MODELS]
   );
   

    const res = JSON.parse(response.text!) as { advice: string };
    return res.advice;
};

// --- Diet Planning (Onboarding) ---

const planSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    targetCalories: { type: Type.NUMBER },
    targetP: { type: Type.NUMBER },
    targetF: { type: Type.NUMBER },
    targetC: { type: Type.NUMBER },
    message: { type: Type.STRING, description: "ユーザーへの生活アドバイスと応援メッセージ (重要: モグちゃんの口調 '〜モグ' で、200文字程度で具体的に)" }
  },
  required: ["targetCalories", "targetP", "targetF", "targetC", "message"],
};

export const generateDietPlan = async (
  currentWeight: number,
  targetWeight: number,
  durationMonths: number
): Promise<{ targetCalories: number; targetP: number; targetF: number; targetC: number; message: string }> => {
  const ai = getAiClient();

  const prompt = `
  ユーザー情報:
  現在の体重: ${currentWeight}kg
  目標体重: ${targetWeight}kg
  達成期間: ${durationMonths}ヶ月
  
  このユーザーのために、健康的かつ現実的な1日の摂取カロリー目標とPFCバランス(g)を算出してください。
  また、目標達成のためにどのような食生活を送るべきか、モグちゃんのキャラクター（語尾はモグ）で優しくアドバイスしてください。
  `;

  const { response, usedModel, fallbackUsed } = await generateContentWithFallback(
    ai,
    {
      contents: prompt,
      config: {
        systemInstruction: "あなたはダイエットアプリのキャラクター「モグちゃん」です。",
        responseMimeType: "application/json",
        responseSchema: planSchema
      }
    },
    [PRIMARY_MODEL, ...FALLBACK_MODELS]
  );

  const plan = JSON.parse(response.text!) as any;
  if (fallbackUsed) plan.message = `（混雑/制限のため ${usedModel} に切り替えました）\n` + plan.message;
  return plan;
};


// --- Mascot Chat with Function Calling ---

// Tool Definitions
const addMealLogTool: FunctionDeclaration = {
  name: "add_meal_log",
  description: "ユーザーが食べたものを新しく記録に追加する。重要: ユーザーが複数の異なる食品（例: 「おにぎりとサラダ」）を食べたと言った場合は、それぞれの食品ごとにこの関数を複数回呼び出して、記録を分けてください。",
  parameters: {
    type: Type.OBJECT,
    properties: {
      item_name: { type: Type.STRING, description: "食べた料理の名前" },
      calories: { type: Type.NUMBER, description: "推定カロリー (kcal)。不明な場合は一般的な値を推測する" },
      p: { type: Type.NUMBER, description: "タンパク質 (g)。推測値" },
      f: { type: Type.NUMBER, description: "脂質 (g)。推測値" },
      c: { type: Type.NUMBER, description: "炭水化物 (g)。推測値" },
      advice: { type: Type.STRING, description: "この食事に対する栄養面での短いアドバイス（100文字程度）。重要: キャラクター語尾（〜モグ等）は禁止。丁寧な「〜です」「〜ます」調の平文。" },
      is_snack: { type: Type.BOOLEAN, description: "間食かどうか" },
      date_iso: { type: Type.STRING, description: "食事をした日時 (ISO 8601 format, e.g. 2023-10-27T12:00:00)。指定がない場合は現在日時。" }
    },
    required: ["item_name", "calories", "p", "f", "c", "advice", "is_snack", "date_iso"]
  }
};

const addWeightLogTool: FunctionDeclaration = {
  name: "add_weight_log",
  description: "ユーザーの体重記録を追加する。ユーザーが「体重が〇〇kgだった」と言った場合に呼び出す。",
  parameters: {
    type: Type.OBJECT,
    properties: {
      weight: { type: Type.NUMBER, description: "体重 (kg)" },
      date_iso: { type: Type.STRING, description: "計測日時 (ISO 8601 format)。指定がない場合は現在日時。" }
    },
    required: ["weight", "date_iso"]
  }
};

const updateUserProfileTool: FunctionDeclaration = {
  name: "update_user_profile",
  description: "ユーザーの目標設定（目標体重や目標カロリー）を変更する。",
  parameters: {
    type: Type.OBJECT,
    properties: {
      targetWeight: { type: Type.NUMBER, description: "新しい目標体重 (kg)" },
      targetCalories: { type: Type.NUMBER, description: "新しい目標摂取カロリー (kcal)" },
    },
  }
};

export interface ChatResponse {
  text: string;
  toolCalls?: {
    name: string;
    args: any;
  }[];
}


export const chatWithMascot = async (
  message: string,
  userProfile: UserProfile,
  recentLogs: MealLog[],
  weightLogs: WeightLog[] = []
): Promise<ChatResponse> => {
  try {
    const ai = getAiClient();

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = recentLogs.filter(l => l.dateLabel === today);
    const todayCals = todayLogs.reduce((acc, l) => acc + l.calories, 0);

    const sortedWeights = [...weightLogs].sort((a, b) => b.timestamp - a.timestamp);
    const latestWeights = sortedWeights.slice(0, 3).map(w => `${new Date(w.timestamp).toLocaleDateString()}: ${w.weight}kg`).join(', ');

    const context = `
  現在の日時: ${new Date().toLocaleString('ja-JP')}
  ユーザー名: ${userProfile.name}
  今日の摂取カロリー: ${Math.round(todayCals)} / 目標 ${userProfile.targetCalories} kcal
  現在の体重: ${userProfile.currentWeight} kg (目標: ${userProfile.targetWeight} kg)
  直近の体重記録: ${latestWeights}
  `;

    const prompt = `
  ${context}
  ユーザーのメッセージ: ${message}
  `;

    const { response, usedModel, fallbackUsed, attempts } = await generateContentWithFallback(
      ai,
      {
        contents: prompt,
        config: {
          systemInstruction: MASCOT_INSTRUCTION,
          tools: [{ functionDeclarations: [addMealLogTool, updateUserProfileTool, addWeightLogTool] }]
        }
      },
      [PRIMARY_MODEL, ...FALLBACK_MODELS]
    );

    const toolCalls = response.functionCalls;
    const notice = fallbackUsed ? `（混雑/不調のため ${usedModel} に切り替えました）\n` : "";
    const text = notice + (response.text || "");

    if (toolCalls && toolCalls.length > 0) {
      return {
        text,
        toolCalls: toolCalls.map(fc => ({ name: fc.name, args: fc.args }))
      };
    }

    return { text: text || "モグ？" };
  } catch (e: any) {
    console.error("chatWithMascot failed:", e);
    return { text: `ごめんね、ちょっと調子が悪いモグ...（${formatErrorShort(e)}）` };
  }
};
