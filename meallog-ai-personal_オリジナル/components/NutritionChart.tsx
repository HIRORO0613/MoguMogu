import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface NutritionChartProps {
  p: number;
  f: number;
  c: number;
}

export const NutritionChart: React.FC<NutritionChartProps> = ({ p, f, c }) => {
  const data = [
    { name: 'タンパク質', value: p, color: '#facc15' }, // yellow-400
    { name: '脂質', value: f, color: '#cbd5e1' },    // slate-300 (Neutral)
    { name: '炭水化物', value: c, color: '#38bdf8' },  // sky-400
  ];

  if (p === 0 && f === 0 && c === 0) {
    return (
        <div className="h-32 w-full flex items-center justify-center text-gray-300 text-xs">
            データなし
        </div>
    );
  }

  return (
    <div className="h-32 w-full relative">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={35}
            outerRadius={50}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: number) => `${value}g`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
        <span className="text-[10px] font-bold text-gray-400">PFC</span>
      </div>
    </div>
  );
};