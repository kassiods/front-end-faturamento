import { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import './styles/App.css';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Transaction {
  _id: string;
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface WeeklyEarning {
  _id: string;
  weekNumber: number;
  grossAmount: number;
  startDate: string;
  endDate: string;
  description: string;
}

interface FinancialSummary {
  monthly: {
    income: number;
    expenses: number;
    balance: number;
    categories: { [key: string]: number };
  };
  weekly: Array<{
    week: number;
    income: number;
    expenses: number;
    balance: number;
    startDate: string;
    endDate: string;
  }>;
}

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'transactions' | 'earnings'>('transactions');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earnings, setEarnings] = useState<WeeklyEarning[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    monthly: { income: 0, expenses: 0, balance: 0, categories: {} },
    weekly: []
  });

  const [transactionForm, setTransactionForm] = useState({
    date: '',
    amount: '',
    description: '',
    category: 'Alimentação'
  });

  const [earningForm, setEarningForm] = useState({
    weekNumber: 1,
    grossAmount: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  const categories = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Educação',
    'Lazer',
    'Despesas',
    'Outros'
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [transactionsRes, earningsRes] = await Promise.all([
          fetch(`${API_BASE}/transactions?month=${selectedMonth}`).then(handleResponse),
          fetch(`${API_BASE}/earnings?month=${selectedMonth}`).then(handleResponse)
        ]);
        
        setTransactions(transactionsRes);
        setEarnings(earningsRes);
        calculateSummary(transactionsRes, earningsRes);
      } catch (error) {
        handleError(error, 'Erro ao carregar dados:');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, activeTab]);

  const calculateSummary = (transactions: Transaction[], earnings: WeeklyEarning[]) => {
    const monthlyIncome = earnings.reduce((sum, item) => sum + item.grossAmount, 0);
    const monthlyExpenses = transactions.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    
    const expensesByCategory = transactions.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + Math.abs(item.amount);
      return acc;
    }, {} as { [key: string]: number });

    const weeklySummary = earnings.map(earning => {
      const weekStart = new Date(earning.startDate);
      const weekEnd = new Date(earning.endDate);
      
      const weekExpenses = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= weekStart && transactionDate <= weekEnd;
      }).reduce((sum, item) => sum + Math.abs(item.amount), 0);

      return {
        week: earning.weekNumber,
        income: earning.grossAmount,
        expenses: weekExpenses,
        balance: earning.grossAmount - weekExpenses,
        startDate: earning.startDate,
        endDate: earning.endDate
      };
    });

    for (let week = 1; week <= 5; week++) {
      if (!weeklySummary.find(w => w.week === week)) {
        weeklySummary.push({
          week,
          income: 0,
          expenses: 0,
          balance: 0,
          startDate: '',
          endDate: ''
        });
      }
    }

    setFinancialSummary({
      monthly: {
        income: monthlyIncome,
        expenses: monthlyExpenses,
        balance: monthlyIncome - monthlyExpenses,
        categories: expensesByCategory
      },
      weekly: weeklySummary.sort((a, b) => a.week - b.week)
    });
  };

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Erro na requisição');
    }
    return response.json();
  };

  const handleError = (error: unknown, context: string) => {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error(context, message);
    alert(`${context} ${message}`);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          date: new Date(transactionForm.date).toISOString(),
          amount: -Math.abs(Number(transactionForm.amount))
        }),
      });

      const [transactionsRes, earningsRes] = await Promise.all([
        fetch(`${API_BASE}/transactions?month=${selectedMonth}`).then(handleResponse),
        fetch(`${API_BASE}/earnings?month=${selectedMonth}`).then(handleResponse)
      ]);
      
      setTransactions(transactionsRes);
      setEarnings(earningsRes);
      calculateSummary(transactionsRes, earningsRes);
      setTransactionForm({
        date: '',
        amount: '',
        description: '',
        category: 'Alimentação'
      });
    } catch (error) {
      handleError(error, 'Erro ao salvar transação:');
    }
  };

  const handleEarningSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`${API_BASE}/earnings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...earningForm,
          grossAmount: Number(earningForm.grossAmount),
          startDate: new Date(earningForm.startDate).toISOString(),
          endDate: new Date(earningForm.endDate).toISOString()
        }),
      });

      const [transactionsRes, earningsRes] = await Promise.all([
        fetch(`${API_BASE}/transactions?month=${selectedMonth}`).then(handleResponse),
        fetch(`${API_BASE}/earnings?month=${selectedMonth}`).then(handleResponse)
      ]);
      
      setTransactions(transactionsRes);
      setEarnings(earningsRes);
      calculateSummary(transactionsRes, earningsRes);
      setEarningForm(prev => ({
        ...prev,
        weekNumber: prev.weekNumber + 1,
        grossAmount: '',
        startDate: '',
        endDate: '',
        description: ''
      }));
    } catch (error) {
      handleError(error, 'Erro ao salvar receita:');
    }
  };

  const chartData = {
    labels: financialSummary.weekly.map(item => `Semana ${item.week}`),
    datasets: [
      {
        label: 'Receitas (R$)',
        data: financialSummary.weekly.map(item => item.income),
        backgroundColor: '#4CAF50',
        borderWidth: 1
      },
      {
        label: 'Despesas (R$)',
        data: financialSummary.weekly.map(item => item.expenses),
        backgroundColor: '#F44336',
        borderWidth: 1
      },
      {
        label: 'Saldo (R$)',
        data: financialSummary.weekly.map(item => item.balance),
        backgroundColor: '#2196F3',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          boxWidth: 20,
          padding: 15,
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: R$ ${context.raw.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value: any) => `R$ ${value}`,
          font: {
            size: window.innerWidth < 768 ? 10 : 12
          }
        }
      }
    }
  };

  return (
    <div className="app-container">
      {isLoading && <div className="loading-overlay">Carregando...</div>}
      
      <header className="app-header">
        <h1>💰 Controle Financeiro Mensal</h1>
        
        <div className="month-selector">
          <label>Selecione o Mês:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        
        <div className="tabs">
          <button
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            🛒 Despesas
          </button>
          <button
            className={activeTab === 'earnings' ? 'active' : ''}
            onClick={() => setActiveTab('earnings')}
          >
            💰 Receitas
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="financial-summary">
          <div className="summary-card monthly-summary">
            <h3>Resumo Mensal</h3>
            <div className="summary-values">
              <div>
                <span>Receitas:</span>
                <span className="income">R$ {financialSummary.monthly.income.toFixed(2)}</span>
              </div>
              <div>
                <span>Despesas:</span>
                <span className="expense">R$ {financialSummary.monthly.expenses.toFixed(2)}</span>
              </div>
              <div>
                <span>Saldo:</span>
                <span className={financialSummary.monthly.balance >= 0 ? 'positive' : 'negative'}>
                  R$ {financialSummary.monthly.balance.toFixed(2)}
                </span>
              </div>
            </div>
            
            <div className="categories-summary">
              <h4>Despesas por Categoria</h4>
              <ul>
                {Object.entries(financialSummary.monthly.categories).map(([category, amount]) => (
                  <li key={category}>
                    <span>{category}:</span>
                    <span>R$ {amount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="weekly-summary">
            {financialSummary.weekly.map((week, index) => (
              <div className="summary-card" key={index}>
                <h3>Semana {week.week}</h3>
                {week.startDate && (
                  <div className="date-range">
                    {new Date(week.startDate).toLocaleDateString()} - {new Date(week.endDate).toLocaleDateString()}
                  </div>
                )}
                <div className="summary-values">
                  <div>
                    <span>Receitas:</span>
                    <span className="income">R$ {week.income.toFixed(2)}</span>
                  </div>
                  <div>
                    <span>Despesas:</span>
                    <span className="expense">R$ {week.expenses.toFixed(2)}</span>
                  </div>
                  <div>
                    <span>Saldo:</span>
                    <span className={week.balance >= 0 ? 'positive' : 'negative'}>
                      R$ {week.balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="data-entry">
          {activeTab === 'transactions' ? (
            <form onSubmit={handleTransactionSubmit}>
              <h2>Adicionar Despesa</h2>
              
              <div className="form-group">
                <label>Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Categoria</label>
                <select
                  value={transactionForm.category}
                  onChange={(e) => setTransactionForm({...transactionForm, category: e.target.value})}
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                  required
                />
              </div>
              
              <button type="submit" className="submit-button">
                Salvar Despesa
              </button>
            </form>
          ) : (
            <form onSubmit={handleEarningSubmit}>
              <h2>Adicionar Receita Semanal</h2>
              
              <div className="form-group">
                <label>Semana</label>
                <select
                  value={earningForm.weekNumber}
                  onChange={(e) => setEarningForm({...earningForm, weekNumber: Number(e.target.value)})}
                >
                  {[1, 2, 3, 4, 5].map(week => (
                    <option key={week} value={week}>Semana {week}</option>
                  ))}
                </select>
              </div>
              
              <div className="form-group">
                <label>Data Início</label>
                <input
                  type="date"
                  value={earningForm.startDate}
                  onChange={(e) => setEarningForm({...earningForm, startDate: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Data Fim</label>
                <input
                  type="date"
                  value={earningForm.endDate}
                  onChange={(e) => setEarningForm({...earningForm, endDate: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Valor Bruto (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={earningForm.grossAmount}
                  onChange={(e) => setEarningForm({...earningForm, grossAmount: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  value={earningForm.description}
                  onChange={(e) => setEarningForm({...earningForm, description: e.target.value})}
                  required
                />
              </div>
              
              <button type="submit" className="submit-button">
                Salvar Receita
              </button>
            </form>
          )}
        </section>

        <section className="chart-section">
          <h2>Desempenho Financeiro Semanal</h2>
          <div className="chart-container">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </section>

        <section className="actions-section">
          <button 
            className="export-button"
            onClick={() => window.open(`${API_BASE}/export?month=${selectedMonth}`, '_blank')}
          >
            📊 Exportar Relatório
          </button>
        </section>
      </main>
    </div>
  );
}