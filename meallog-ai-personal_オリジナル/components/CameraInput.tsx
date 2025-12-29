import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, X, Send, Type } from 'lucide-react';
import { Button } from './Button';

interface CameraInputProps {
  onAnalyze: (data: { image?: string; text?: string }) => void;
  onCancel: () => void;
}

export const CameraInput: React.FC<CameraInputProps> = ({ onAnalyze, onCancel }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [mode, setMode] = useState<'camera' | 'text'>('camera');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    // Must have either image OR text
    if (!preview && !textInput.trim()) return;

    const base64 = preview ? preview.split(',')[1] : undefined;
    onAnalyze({ image: base64, text: textInput });
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto relative">
       {/* Header */}
       <div className="p-4 border-b flex justify-between items-center bg-white sticky top-0 z-10">
         <h2 className="text-lg font-bold text-gray-800">食事を記録</h2>
         <button onClick={onCancel} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full">
            <X size={24} />
         </button>
       </div>

       <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Toggle Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-xl">
             <button 
                onClick={() => setMode('camera')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'camera' ? 'bg-white shadow-sm text-sky-500' : 'text-gray-500'}`}
             >
                <Camera size={16} /> 写真
             </button>
             <button 
                onClick={() => setMode('text')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${mode === 'text' ? 'bg-white shadow-sm text-sky-500' : 'text-gray-500'}`}
             >
                <Type size={16} /> テキスト
             </button>
          </div>

          {mode === 'camera' && (
            <div className="space-y-4">
                {preview ? (
                    <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-md border border-gray-100">
                        <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => setPreview(null)}
                            className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                        onClick={triggerFileSelect}
                        className="aspect-square bg-sky-50 rounded-2xl flex flex-col items-center justify-center gap-2 text-sky-500 hover:bg-sky-100 transition-colors border-2 border-sky-100 border-dashed"
                        >
                            <Camera size={32} />
                            <span className="font-bold text-sm">カメラ起動</span>
                        </button>

                        <button 
                        onClick={triggerFileSelect}
                        className="aspect-square bg-yellow-50 rounded-2xl flex flex-col items-center justify-center gap-2 text-yellow-600 hover:bg-yellow-100 transition-colors border-2 border-yellow-100 border-dashed"
                        >
                            <ImageIcon size={32} />
                            <span className="font-bold text-sm">アルバム</span>
                        </button>
                    </div>
                )}
                <p className="text-xs text-center text-gray-400">※ 写真から自動でメニューと栄養を推定します</p>
            </div>
          )}

          {/* Text Input Area - Always visible if mode is text, or optional if mode is camera */}
          <div className={`space-y-2 ${mode === 'camera' && !preview ? 'opacity-50 pointer-events-none' : ''}`}>
             <label className="text-sm font-bold text-gray-700">メモ・補足情報</label>
             <textarea 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={mode === 'camera' ? "例: ドレッシングはノンオイル" : "例: カツ丼と味噌汁を食べました"}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none h-32 text-base text-gray-900 placeholder-gray-400"
             />
          </div>
       </div>

       {/* Footer */}
       <div className="p-4 border-t bg-white sticky bottom-0">
          <Button 
            onClick={handleConfirm} 
            disabled={(!preview && !textInput.trim())}
            className="flex items-center justify-center gap-2"
          >
            <Send size={18} />
            {mode === 'camera' ? '写真で分析する' : 'テキストで分析する'}
          </Button>
       </div>

       <input 
        type="file" 
        accept="image/*" 
        capture="environment"
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
    </div>
  );
};