import React from 'react';
import { Home, Calendar, Settings } from 'lucide-react';
import { AppView } from '../types';

interface BottomNavProps {
  currentView: AppView;
  onChange: (view: AppView) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
  const isInput = currentView === AppView.INPUT;
  if (isInput) return null;

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button 
      onClick={() => onChange(view)}
      className={`flex flex-col items-center gap-1 p-2 flex-1 transition-colors ${currentView === view ? 'text-sky-500' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <Icon size={24} strokeWidth={currentView === view ? 2.5 : 2} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-6 py-2 pb-safe z-30 flex justify-between items-center max-w-md mx-auto">
      <NavItem view={AppView.HOME} icon={Home} label="ホーム" />
      <div className="w-12"></div> {/* Spacer for FAB */}
      <NavItem view={AppView.CALENDAR} icon={Calendar} label="記録" />
    </div>
  );
};