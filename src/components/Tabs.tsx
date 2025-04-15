// client/src/components/Tabs.tsx
import { useState } from 'react';

export const Tabs = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  return (
    <div className="tabs">
      <button 
        className={activeTab === 'daily' ? 'active' : ''} 
        onClick={() => setActiveTab('daily')}
      >
        Gastos Diários
      </button>
      <button 
        className={activeTab === 'weekly' ? 'active' : ''} 
        onClick={() => setActiveTab('weekly')}
      >
        Ganhos Semanais
      </button>
    </div>
  );
};