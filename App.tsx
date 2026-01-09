import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Dices, User, TrendingUp, AlertTriangle, 
  DollarSign, Briefcase, XCircle, LayoutGrid, 
  Building2, Users, Trophy, PlayCircle, SkipForward, ArrowRightLeft, Lock,
  Info, Sparkles, AlertOctagon, Coins, BookOpen, HelpCircle, Skull
} from 'lucide-react';
import { 
  Player, GamePhase, CellType, GameState, 
  Cell, Card, ChannelData
} from './types';
import { CELLS, BRIEFS, MARKETS, GROUPS } from './constants';

// --- Components Helper Functions ---

const rollDice = () => [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1] as [number, number];

const getRent = (cell: Cell, level: number): number => {
  if (!cell.data) return 0;
  const multiplier = cell.data.rentMultipliers[level] || 1;
  return cell.data.baseRent * multiplier;
};

const hasMonopoly = (playerId: number, group: string, players: Player[]): boolean => {
  const player = players.find(p => p.id === playerId);
  if (!player) return false;
  const groupCells = CELLS.filter(c => c.data?.groupId === group);
  return groupCells.every(c => player.ownedProperties.includes(c.id));
};

const INITIAL_MONEY = 15000;

// --- Helper for explanations ---
const getCellExplanation = (cell: Cell, player: Player, players: Player[]): { title: string, desc: string, icon: React.ReactNode, mood: 'neutral' | 'good' | 'bad' | 'info' } => {
  const owner = players.find(p => p.ownedProperties.includes(cell.id));
  
  if (cell.type === CellType.START) {
    return { title: "Старт", desc: "Вы получаете бюджет на новый круг медиапланирования.", icon: <Coins className="w-5 h-5"/>, mood: 'good' };
  }
  if (cell.type === CellType.GOTO_CRISIS) {
    return { title: "Арест счетов", desc: "Вы отправляетесь в зону Кризиса. Ваши активы заморожены на время.", icon: <Lock className="w-5 h-5"/>, mood: 'bad' };
  }
  if (cell.type === CellType.CRISIS) {
    return { title: "Зона Кризиса", desc: "Просто посещение. Если вы не отправлены сюда принудительно, вы в безопасности.", icon: <AlertOctagon className="w-5 h-5"/>, mood: 'neutral' };
  }
  if (cell.type === CellType.TAX) {
    return { title: "Финансовая нагрузка", desc: `Обязательный платеж: ${cell.taxAmount}₿. Налоги или комиссии системы.`, icon: <DollarSign className="w-5 h-5"/>, mood: 'bad' };
  }
  if (cell.type === CellType.BRIEF) {
    return { title: "Бриф Клиента", desc: "Тяните карточку! Это может быть выгодный контракт или сложная задача с рисками.", icon: <Briefcase className="w-5 h-5"/>, mood: 'info' };
  }
  if (cell.type === CellType.MARKET) {
    return { title: "Рыночная Ситуация", desc: "Внешние факторы влияют на всех. Рост цен, законы или сезонность.", icon: <TrendingUp className="w-5 h-5"/>, mood: 'info' };
  }
  if (cell.type === CellType.CHANNEL) {
    if (owner) {
      if (owner.id === player.id) {
        return { title: "Ваш Канал", desc: "Вы владеете этой площадкой. Можете улучшать уровни размещения.", icon: <Building2 className="w-5 h-5"/>, mood: 'good' };
      } else {
        return { title: "Чужое Размещение", desc: `Площадка принадлежит ${owner.name}. Вы оплачиваете размещение рекламы (ренту).`, icon: <AlertTriangle className="w-5 h-5"/>, mood: 'bad' };
      }
    } else {
      return { title: "Свободный слот", desc: `Канал "${cell.name}" свободен. Купите его, чтобы получать доход с конкурентов.`, icon: <Sparkles className="w-5 h-5"/>, mood: 'good' };
    }
  }
  return { title: cell.name, desc: "", icon: <Info/>, mood: 'neutral' };
};

// --- Main App Component ---

export default function App() {
  // --- State ---
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    turnCount: 1,
    phase: GamePhase.SETUP,
    dice: [1, 1],
    logs: [],
    lastActionMessage: null,
    winnerId: null,
    settings: {
      maxTimeMinutes: 60,
      auctionEnabled: true,
      uniformBuild: true
    },
    startTime: Date.now()
  });

  const [setupConfig, setSetupConfig] = useState({
    playerCount: 3,
    names: ["Агентство Alpha", "Beta Media", "Gamma Group", "Delta Comms", "Epsilon"]
  });

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [showBuyModal, setShowBuyModal] = useState<number | null>(null); // Cell ID
  const [showManageModal, setShowManageModal] = useState<boolean>(false);
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [activeCellExplanation, setActiveCellExplanation] = useState<{title: string, desc: string, mood: string} | null>(null);

  // --- Game Loop Helpers ---

  const addLog = (msg: string) => {
    setGameState(prev => ({
      ...prev,
      logs: [{ turn: prev.turnCount, message: msg, timestamp: Date.now() }, ...prev.logs].slice(0, 50)
    }));
  };

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  const eliminatePlayer = (playerId: number, reason: string) => {
    addLog(`Игрок ${gameState.players[playerId].name} ОБАНКРОТИЛСЯ! ${reason}`);
    
    // Reset properties owned by this player
    const updatedPlayers = gameState.players.map(p => {
      if (p.id === playerId) {
        return { 
          ...p, 
          isBankrupt: true, 
          balance: 0, 
          ownedProperties: [], 
          propertyLevels: {} 
        };
      }
      return p;
    });

    setGameState(prev => ({ ...prev, players: updatedPlayers }));
    
    // Check if only one player remains
    const activePlayers = updatedPlayers.filter(p => !p.isBankrupt);
    if (activePlayers.length === 1) {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, winnerId: activePlayers[0].id, phase: GamePhase.GAME_OVER }));
      }, 1500);
    }
  };

  const checkWinner = useCallback(() => {
    // Check bankruptcy count
    const activePlayers = gameState.players.filter(p => !p.isBankrupt);
    if (activePlayers.length <= 1 && gameState.phase !== GamePhase.SETUP) {
      // If we are already in setup, don't trigger. 
      // If only 1 player left during game
      if (activePlayers.length === 1) {
        setGameState(prev => ({ ...prev, winnerId: activePlayers[0].id, phase: GamePhase.GAME_OVER }));
      }
      return;
    }
    
    // Check timer
    const elapsed = (Date.now() - gameState.startTime) / 60000;
    if (elapsed >= gameState.settings.maxTimeMinutes && gameState.phase !== GamePhase.SETUP) {
      let maxScore = -Infinity;
      let wId = -1;
      gameState.players.forEach(p => {
        if (p.isBankrupt) return;
        const assetValue = p.ownedProperties.reduce((sum, cid) => sum + (CELLS[cid].data?.price || 0), 0);
        const buildValue = p.ownedProperties.reduce((sum, cid) => {
           const lvl = p.propertyLevels[cid] || 0;
           const c = CELLS[cid];
           return sum + (lvl * (c.data?.buildCost || 0));
        }, 0);
        const bonus = p.efficiency * 500;
        const total = p.balance + assetValue + buildValue + bonus;
        if (total > maxScore) {
          maxScore = total;
          wId = p.id;
        }
      });
      setGameState(prev => ({ ...prev, winnerId: wId, phase: GamePhase.GAME_OVER }));
    }
  }, [gameState.players, gameState.settings.maxTimeMinutes, gameState.startTime, gameState.phase]);

  const nextTurn = () => {
    checkWinner();
    setActiveCellExplanation(null);
    setGameState(prev => {
      // Logic to find next non-bankrupt player
      let nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      let loops = 0;
      while (prev.players[nextIndex].isBankrupt && loops < prev.players.length) {
        nextIndex = (nextIndex + 1) % prev.players.length;
        loops++;
      }
      
      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        turnCount: prev.turnCount + 1,
        phase: GamePhase.TURN_START,
        lastActionMessage: null
      };
    });
  };

  const updatePlayer = (id: number, changes: Partial<Player>) => {
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, ...changes } : p)
    }));
  };

  // --- Core Mechanics ---

  const handleStartGame = () => {
    const players: Player[] = Array.from({ length: setupConfig.playerCount }).map((_, i) => ({
      id: i,
      name: setupConfig.names[i],
      color: ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][i],
      balance: INITIAL_MONEY,
      position: 0,
      efficiency: 2,
      isJailed: false,
      jailTurns: 0,
      ownedProperties: [],
      propertyLevels: {},
      isMortgaged: {},
      isBankrupt: false,
      hasSynergy: false,
      hasAntiCrisis: false
    }));

    setGameState(prev => ({
      ...prev,
      players,
      phase: GamePhase.TURN_START,
      startTime: Date.now()
    }));
  };

  const handleRoll = () => {
    const [d1, d2] = rollDice();
    const isDouble = d1 === d2;
    const total = d1 + d2;
    
    // Jail Logic
    if (currentPlayer.isJailed) {
      if (isDouble) {
        addLog(`${currentPlayer.name} выбросил дубль и выходит из Кризиса!`);
        updatePlayer(currentPlayer.id, { isJailed: false, jailTurns: 0 });
        movePlayer(total);
      } else {
        if (currentPlayer.jailTurns >= 2) {
          addLog(`${currentPlayer.name} платит 1000₿ за выход из Кризиса.`);
          if (currentPlayer.balance < 1000) {
            eliminatePlayer(currentPlayer.id, "Не хватило средств выйти из Кризиса");
            setTimeout(nextTurn, 2000);
          } else {
            updatePlayer(currentPlayer.id, { isJailed: false, jailTurns: 0, balance: currentPlayer.balance - 1000 });
            movePlayer(total);
          }
        } else {
           addLog(`${currentPlayer.name} сидит в Кризисе (попытка ${currentPlayer.jailTurns + 1}).`);
           updatePlayer(currentPlayer.id, { jailTurns: currentPlayer.jailTurns + 1 });
           setTimeout(nextTurn, 1000);
        }
      }
      setGameState(prev => ({ ...prev, dice: [d1, d2] }));
      return;
    }

    setGameState(prev => ({ ...prev, dice: [d1, d2] }));
    movePlayer(total);
  };

  const movePlayer = (steps: number) => {
    let newPos = (currentPlayer.position + steps) % 40;
    if (newPos < currentPlayer.position) {
      const income = 2000 + (currentPlayer.efficiency * 200);
      addLog(`${currentPlayer.name} прошел Старт! +${income}₿`);
      updatePlayer(currentPlayer.id, { balance: currentPlayer.balance + income });
    }
    updatePlayer(currentPlayer.id, { position: newPos });
    handleLandOnCell(newPos);
  };

  const handleLandOnCell = (pos: number) => {
    const cell = CELLS[pos];
    setGameState(prev => ({ ...prev, phase: GamePhase.ACTION }));
    
    // Set explanation for UI
    const explanation = getCellExplanation(cell, currentPlayer, gameState.players);
    setActiveCellExplanation({
      title: explanation.title,
      desc: explanation.desc,
      mood: explanation.mood
    });

    if (cell.type === CellType.GOTO_CRISIS) {
      addLog(`${currentPlayer.name} отправляется в Кризис!`);
      setTimeout(() => {
        updatePlayer(currentPlayer.id, { position: 10, isJailed: true, jailTurns: 0 });
        nextTurn();
      }, 2000);
      return;
    }

    if (cell.type === CellType.TAX) {
      const tax = cell.taxAmount || 1000;
      addLog(`${currentPlayer.name} платит ${tax}₿ (${cell.name}).`);
      
      if (currentPlayer.balance < tax) {
        eliminatePlayer(currentPlayer.id, `Невозможно уплатить налог ${tax}₿`);
        setTimeout(nextTurn, 2000);
      } else {
        updatePlayer(currentPlayer.id, { balance: currentPlayer.balance - tax });
      }
      return;
    }

    if (cell.type === CellType.BRIEF) {
      const card = BRIEFS[Math.floor(Math.random() * BRIEFS.length)];
      setTimeout(() => setActiveCard(card), 800);
      return;
    }

    if (cell.type === CellType.MARKET) {
      const card = MARKETS[Math.floor(Math.random() * MARKETS.length)];
      setTimeout(() => setActiveCard(card), 800);
      return;
    }

    if (cell.type === CellType.CHANNEL) {
       const owner = gameState.players.find(p => p.ownedProperties.includes(cell.id));
       if (owner) {
         if (owner.id !== currentPlayer.id && !owner.isJailed && !owner.isMortgaged[cell.id]) {
            const level = owner.propertyLevels[cell.id] || 0;
            const rent = getRent(cell, level);
            addLog(`${currentPlayer.name} попал к ${owner.name}. Платит ${rent}₿.`);
            
            if (currentPlayer.balance < rent) {
               eliminatePlayer(currentPlayer.id, `Невозможно оплатить ренту ${rent}₿ игроку ${owner.name}`);
               updatePlayer(owner.id, { balance: owner.balance + currentPlayer.balance }); // Owner gets whatever is left
               setTimeout(nextTurn, 2000);
            } else {
               updatePlayer(currentPlayer.id, { balance: currentPlayer.balance - rent });
               updatePlayer(owner.id, { balance: owner.balance + rent });
            }
         }
       } else {
         setTimeout(() => setShowBuyModal(cell.id), 800);
       }
    }
  };

  const handleBuy = (cellId: number) => {
    const cell = CELLS[cellId];
    if (!cell.data) return;
    if (currentPlayer.balance >= cell.data.price) {
      updatePlayer(currentPlayer.id, { 
        balance: currentPlayer.balance - cell.data.price,
        ownedProperties: [...currentPlayer.ownedProperties, cellId],
        propertyLevels: { ...currentPlayer.propertyLevels, [cellId]: 0 }
      });
      addLog(`${currentPlayer.name} купил ${cell.name} за ${cell.data.price}₿.`);
    } else {
      addLog(`${currentPlayer.name} не хватает средств.`);
    }
    setShowBuyModal(null);
  };

  const handleApplyCard = () => {
    if (!activeCard) return;
    const updates = activeCard.effect(currentPlayer, gameState.players, addLog);
    
    // Check bankruptcy after card effect (simplified check)
    if (updates.balance !== undefined && updates.balance < 0) {
       eliminatePlayer(currentPlayer.id, `Банкротство из-за события "${activeCard.title}"`);
       setActiveCard(null);
       setTimeout(nextTurn, 2000);
       return;
    }

    updatePlayer(currentPlayer.id, updates);
    setActiveCard(null);
  };

  // --- Rendering Helpers ---

  const renderBoard = () => {
    return CELLS.map((cell) => {
      let gridClass = '';
      if (cell.id >= 20 && cell.id <= 30) {
        gridClass = `grid-row-start-1 grid-col-start-${cell.id - 19}`; 
      } else if (cell.id >= 31 && cell.id <= 39) {
        gridClass = `grid-col-start-11 grid-row-start-${cell.id - 29}`;
      } else if (cell.id >= 0 && cell.id <= 10) {
        gridClass = `grid-row-start-11 grid-col-start-${11 - cell.id}`;
      } else { 
        gridClass = `grid-col-start-1 grid-row-start-${21 - cell.id}`;
      }

      const playersHere = gameState.players.filter(p => p.position === cell.id && !p.isBankrupt);
      const owner = gameState.players.find(p => p.ownedProperties.includes(cell.id));
      const level = owner ? (owner.propertyLevels[cell.id] || 0) : 0;
      
      let typeColor = 'bg-white';
      let icon = null;
      if (cell.type === CellType.START) { typeColor = 'bg-emerald-50'; icon = <SkipForward className="w-4 h-4 text-emerald-600"/>; }
      if (cell.type === CellType.CRISIS) { typeColor = 'bg-orange-50'; icon = <Lock className="w-4 h-4 text-orange-600"/>; }
      if (cell.type === CellType.GOTO_CRISIS) { typeColor = 'bg-red-50'; icon = <AlertOctagon className="w-4 h-4 text-red-600"/>; }
      if (cell.type === CellType.BRIEF) { typeColor = 'bg-blue-50'; icon = <Briefcase className="w-4 h-4 text-blue-600"/>; }
      if (cell.type === CellType.MARKET) { typeColor = 'bg-purple-50'; icon = <TrendingUp className="w-4 h-4 text-purple-600"/>; }
      if (cell.type === CellType.TAX) { typeColor = 'bg-slate-100'; icon = <DollarSign className="w-4 h-4 text-slate-600"/>; }

      // Ownership Border Logic
      const ownershipStyle = owner ? `ring-inset ring-4 ${owner.color.replace('bg-', 'ring-')}` : '';

      return (
        <div key={cell.id} className={`cell ${gridClass} ${typeColor} ${ownershipStyle} border border-slate-300 relative group transition-all hover:z-10 hover:shadow-lg`}>
            {/* Ownership Badge Corner */}
            {owner && (
               <div className={`absolute top-0 right-0 p-1 rounded-bl-lg shadow-sm z-10 ${owner.color}`}>
                  <div className="text-[8px] font-black text-white leading-none">
                    {owner.name[0]}
                  </div>
               </div>
            )}

            {/* Header Color Strip for Channels */}
            {cell.data ? (
              <div className="h-3 w-full border-b border-black/10" style={{background: cell.data.color}}></div>
            ) : (
              <div className="h-2 w-full"></div>
            )}

            <div className="w-full h-full flex flex-col justify-between items-center p-1 pb-4">
               {/* Cell Icon or Price */}
               {icon && <div className="mb-1">{icon}</div>}
               
               <span className="text-[9px] text-center font-bold leading-tight text-slate-800 line-clamp-2">{cell.name}</span>
               
               {/* Ownership / Price Indicator */}
               {cell.type === CellType.CHANNEL && (
                 <>
                   {!owner ? (
                     <span className="text-[8px] text-slate-500 font-mono">{cell.data?.price}₿</span>
                   ) : (
                      <div className="flex flex-col items-center mt-1">
                        {level > 0 && <div className="flex gap-0.5">{Array(level).fill(0).map((_,i)=><div key={i} className="w-1.5 h-1.5 rounded-full bg-yellow-500 shadow-sm border border-yellow-600"/>)}</div>}
                      </div>
                   )}
                 </>
               )}
            </div>
            
            {/* Player Tokens */}
            <div className="absolute bottom-1 left-0 w-full flex justify-center -space-x-1.5 px-1">
               {playersHere.map(p => (
                  <div key={p.id} className={`w-5 h-5 rounded-full border-2 border-white shadow-md z-10 flex items-center justify-center text-[8px] font-bold text-white ${p.color}`} title={p.name}>
                    {p.name[0]}
                  </div>
               ))}
            </div>
        </div>
      );
    });
  };

  // --- Screens ---

  if (gameState.phase === GamePhase.SETUP) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4 font-sans text-slate-100 relative">
        <div className="max-w-md w-full bg-slate-800 rounded-xl p-8 shadow-2xl border border-slate-700">
          <div className="flex items-center justify-center mb-6">
            <TrendingUp className="w-10 h-10 text-brand-primary mr-2" />
            <h1 className="text-3xl font-bold text-white">МедиаМонополия</h1>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Количество команд</label>
              <div className="flex gap-2">
                {[3, 4, 5].map(n => (
                  <button 
                    key={n}
                    onClick={() => setSetupConfig({ ...setupConfig, playerCount: n })}
                    className={`flex-1 py-2 rounded font-bold transition-all ${setupConfig.playerCount === n ? 'bg-blue-600 text-white shadow-lg scale-105' : 'bg-slate-700 text-slate-300'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-400">Названия команд</label>
              {Array.from({ length: setupConfig.playerCount }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'][i]}`}>
                    {i+1}
                  </div>
                  <input 
                    className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    value={setupConfig.names[i]}
                    onChange={(e) => {
                      const newNames = [...setupConfig.names];
                      newNames[i] = e.target.value;
                      setSetupConfig({ ...setupConfig, names: newNames });
                    }}
                  />
                </div>
              ))}
            </div>
            
            <div className="flex gap-3 mt-6">
                <button 
                  onClick={() => setShowRulesModal(true)}
                  className="flex-1 py-3 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  Правила
                </button>
                <button 
                  onClick={handleStartGame}
                  className="flex-[2] py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-lg shadow-lg shadow-blue-900/50 transition-all hover:scale-[1.02]"
                >
                  Начать Игру
                </button>
            </div>
          </div>
        </div>

        {/* RULES MODAL IN SETUP */}
        {showRulesModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white text-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600"/>
                    Инструкция
                  </h2>
                  <button onClick={() => setShowRulesModal(false)}><XCircle className="w-8 h-8 text-slate-300 hover:text-slate-500"/></button>
                </div>
                
                <div className="space-y-6">
                  <section>
                    <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Цель Игры</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Стать монополистом на рынке медиа. Выигрывает тот, кто останется единственным платежеспособным игроком или будет иметь наибольший капитал (деньги + активы) по истечении времени.
                    </p>
                  </section>
                  <section className="grid md:grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Валюта (₿)</h4>
                        <p className="text-sm text-slate-500">Бюджет агентства. Используется для покупки каналов, оплаты налогов и ренты конкурентам.</p>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-yellow-600 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Эффективность (E)</h4>
                        <p className="text-sm text-slate-500">Показатель качества ваших кампаний. Влияет на доход при прохождении круга (+200₿ за уровень).</p>
                     </div>
                  </section>
                </div>
                <div className="mt-8 text-center">
                  <button onClick={() => setShowRulesModal(false)} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Всё понятно, играть!</button>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  if (gameState.phase === GamePhase.GAME_OVER) {
    const winner = gameState.players.find(p => p.id === gameState.winnerId);
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center text-white p-4">
        <div className="text-center bg-slate-800 p-12 rounded-3xl shadow-2xl border-4 border-yellow-500/30 max-w-lg w-full">
          <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-6 animate-bounce" />
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-yellow-200 to-yellow-600 text-transparent bg-clip-text">ПОБЕДА!</h1>
          <h2 className="text-3xl text-white mb-8">{winner?.name}</h2>
          
          <div className="grid grid-cols-2 gap-4 text-left bg-slate-700/50 p-6 rounded-xl mb-8">
            <div>
              <p className="text-sm text-slate-400">Итоговый Баланс</p>
              <p className="text-2xl font-mono font-bold text-green-400">{winner?.balance}₿</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Эффективность</p>
              <p className="text-2xl font-mono font-bold text-blue-400">{winner?.efficiency}/5</p>
            </div>
          </div>
          
          <button onClick={() => window.location.reload()} className="w-full px-6 py-4 bg-slate-600 hover:bg-slate-500 rounded-xl text-white font-bold text-lg transition-all">Вернуться в меню</button>
        </div>
      </div>
    );
  }

  // --- Main Game UI ---

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* LEFT: Game Board */}
      <div className="flex-1 flex items-center justify-center p-2 md:p-6 overflow-hidden">
         <div className="board-container">
            <div className="board-grid">
              {renderBoard()}
              
              {/* Dynamic Action Center */}
              <div className="center-area px-4 md:px-8 py-4">
                
                {/* Logo / Brand */}
                <div className="absolute top-6 left-0 w-full flex justify-center opacity-10 pointer-events-none">
                   <div className="text-4xl md:text-6xl font-black text-slate-800 tracking-widest uppercase">Media</div>
                </div>

                {/* Main Interaction Area */}
                <div className="relative z-10 w-full max-w-md flex flex-col items-center gap-4">
                   
                   {/* 1. Status / Instructions */}
                   <div className="text-center">
                     {gameState.phase === GamePhase.TURN_START && (
                       <div className="animate-fade-in-up">
                         {gameState.turnCount === 1 && gameState.currentPlayerIndex === 0 && (
                            <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg text-sm font-bold mb-3 border border-yellow-200 shadow-sm animate-pulse">
                               Добро пожаловать! Бросайте кубики, чтобы начать захват рынка.
                            </div>
                         )}
                         <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Ход команды</div>
                         <h2 className="text-2xl md:text-3xl font-black text-slate-800 mb-4 bg-white/50 px-4 py-1 rounded-full shadow-sm backdrop-blur-sm border border-slate-200 inline-block">
                           <span className={`inline-block w-4 h-4 rounded-full mr-2 ${currentPlayer.color}`}/>
                           {currentPlayer.name}
                         </h2>
                         <p className="text-slate-600">Нажмите <span className="font-bold text-blue-600">Бросок</span>, чтобы сделать ход.</p>
                       </div>
                     )}

                     {gameState.phase === GamePhase.ACTION && (
                       activeCellExplanation ? (
                         <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200 max-w-sm mx-auto animate-fade-in">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner
                              ${activeCellExplanation.mood === 'good' ? 'bg-green-100 text-green-600' : 
                                activeCellExplanation.mood === 'bad' ? 'bg-red-100 text-red-600' : 
                                activeCellExplanation.mood === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                               <Info className="w-6 h-6"/>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{activeCellExplanation.title}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">{activeCellExplanation.desc}</p>
                         </div>
                       ) : (
                         <div className="animate-fade-in bg-white/50 p-4 rounded-xl border border-slate-200 backdrop-blur-sm">
                           <p className="text-slate-700 font-medium">Действий больше нет. Оцените поле и завершите ход.</p>
                         </div>
                       )
                     )}
                   </div>

                   {/* 2. Dice Result */}
                   <div className="flex gap-4 my-2">
                      <div className={`w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_0_rgba(0,0,0,0.1)] border border-slate-200 flex items-center justify-center text-3xl font-bold text-slate-800 transition-transform ${gameState.phase === GamePhase.ROLL ? 'scale-110' : ''}`}>
                        {gameState.dice[0]}
                      </div>
                      <div className={`w-14 h-14 bg-white rounded-xl shadow-[0_4px_0_0_rgba(0,0,0,0.1)] border border-slate-200 flex items-center justify-center text-3xl font-bold text-slate-800 transition-transform ${gameState.phase === GamePhase.ROLL ? 'scale-110' : ''}`}>
                        {gameState.dice[1]}
                      </div>
                   </div>

                   {/* 3. Action Log (Smaller) */}
                   <div className="w-full max-h-24 overflow-hidden relative mt-2">
                      <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none"/>
                      {gameState.logs.slice(0, 3).map((log, i) => (
                        <div key={i} className="text-xs text-slate-500 py-1 text-center animate-fade-in">
                           {log.message}
                        </div>
                      ))}
                   </div>
                </div>

              </div>
            </div>
         </div>
      </div>

      {/* RIGHT: Dashboard */}
      <div className="w-full md:w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl z-20">
        
        {/* Current Player Header */}
        <div className="p-6 bg-slate-900 text-white relative overflow-hidden">
           {/* Background Pattern */}
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <TrendingUp className="w-32 h-32" />
           </div>

           <div className="flex items-center justify-between mb-6 relative z-10">
             <div className="flex items-center gap-3">
               <div className={`w-12 h-12 rounded-xl shadow-lg border-2 border-white/20 ${currentPlayer.color} flex items-center justify-center text-xl font-bold`}>
                 {currentPlayer.name[0]}
               </div>
               <div>
                 <h2 className="text-lg font-bold leading-tight">{currentPlayer.name}</h2>
                 <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold mt-0.5">Ваш ход</div>
               </div>
             </div>
             <button 
                onClick={() => setShowRulesModal(true)}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
                title="Правила игры"
             >
                <HelpCircle className="w-5 h-5"/>
             </button>
           </div>

           <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 group relative" title="Бюджет для покупки каналов и оплаты штрафов">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">Баланс <Info className="w-3 h-3 opacity-50"/></div>
                <div className="text-2xl font-mono text-emerald-400 font-bold tracking-tight">{currentPlayer.balance}₿</div>
              </div>
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 group relative" title="Влияет на доход круга (+200 за уровень) и шансы в событиях">
                <div className="text-xs text-slate-400 mb-1 flex items-center gap-1">Эффективность <Info className="w-3 h-3 opacity-50"/></div>
                <div className="flex items-center text-yellow-400 font-bold gap-1">
                   <span className="text-2xl">{currentPlayer.efficiency}</span>
                   <span className="text-sm text-yellow-400/50">/ 5</span>
                </div>
              </div>
           </div>

           {/* Controls */}
           <div className="grid grid-cols-2 gap-3 relative z-10">
              <button 
                disabled={gameState.phase !== GamePhase.TURN_START}
                onClick={handleRoll}
                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95
                  ${gameState.phase === GamePhase.TURN_START 
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 hover:shadow-blue-900/70 animate-pulse ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
              >
                <Dices className="w-5 h-5" /> Бросок
              </button>
              
              <button 
                disabled={gameState.phase !== GamePhase.ACTION}
                onClick={nextTurn}
                className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95
                  ${gameState.phase === GamePhase.ACTION
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50 hover:shadow-emerald-900/70 animate-pulse ring-2 ring-offset-2 ring-offset-slate-900 ring-emerald-500' 
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'}`}
              >
                <SkipForward className="w-5 h-5" /> Завершить
              </button>
           </div>
        </div>

        {/* Tab / Actions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50">
           
           {/* Quick Actions */}
           <div className="space-y-2">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Действия</h3>
             <div className="grid grid-cols-2 gap-3">
               <button onClick={() => setShowManageModal(true)} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all text-sm font-bold text-slate-700 flex flex-col items-center gap-2 group">
                 <div className="p-2 bg-indigo-50 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <Building2 className="w-6 h-6 text-indigo-500" />
                 </div>
                 Мои Каналы
               </button>
               <button disabled className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-400 flex flex-col items-center gap-2 opacity-60 cursor-not-allowed">
                 <div className="p-2 bg-slate-100 rounded-lg">
                   <ArrowRightLeft className="w-6 h-6 text-slate-400" />
                 </div>
                 Сделка (Скоро)
               </button>
             </div>
           </div>

           {/* Player List */}
           <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Рынок</h3>
             {gameState.players.filter(p => p.id !== currentPlayer.id).map(p => (
               <div key={p.id} className={`p-3 rounded-xl border bg-white flex justify-between items-center shadow-sm ${p.isBankrupt ? 'opacity-50 grayscale bg-red-50' : 'border-slate-200'}`}>
                  <div className="flex items-center gap-3">
                    {p.isBankrupt ? (
                        <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center text-red-600">
                           <Skull className="w-5 h-5"/>
                        </div>
                    ) : (
                        <div className={`w-8 h-8 rounded-full ${p.color} flex items-center justify-center text-white text-xs font-bold shadow-sm`}>
                          {p.name[0]}
                        </div>
                    )}
                    
                    <div>
                       <div className={`font-bold text-sm ${p.isBankrupt ? 'text-red-400 line-through' : 'text-slate-700'}`}>{p.name}</div>
                       <div className="text-[10px] text-slate-400">{p.isBankrupt ? 'Банкрот' : `${p.ownedProperties.length} каналов`}</div>
                    </div>
                  </div>
                  {!p.isBankrupt && (
                    <div className="text-right">
                      <span className="block font-mono text-sm font-bold text-slate-700">{p.balance}₿</span>
                      <span className="text-[10px] text-yellow-600 font-bold">E: {p.efficiency}</span>
                    </div>
                  )}
               </div>
             ))}
           </div>

        </div>
      </div>

      {/* --- MODALS --- */}

      {/* RULES MODAL (In-Game & Setup) */}
      {showRulesModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white text-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 shadow-2xl">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-black flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-blue-600"/>
                    Инструкция
                  </h2>
                  <button onClick={() => setShowRulesModal(false)}><XCircle className="w-8 h-8 text-slate-300 hover:text-slate-500"/></button>
                </div>
                
                <div className="space-y-6">
                  <section>
                    <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500"/> Цель Игры</h3>
                    <p className="text-slate-600 leading-relaxed">
                      Стать монополистом на рынке медиа. Выигрывает тот, кто останется единственным платежеспособным игроком или будет иметь наибольший капитал (деньги + активы) по истечении времени.
                    </p>
                    <div className="bg-red-50 border border-red-100 p-3 rounded-lg mt-2 text-sm text-red-700 font-medium">
                       <span className="font-bold">Важно:</span> Если ваш баланс опускается ниже нуля и вы не можете оплатить долг — вы немедленно выбываете из игры (банкротство).
                    </div>
                  </section>

                  <section className="grid md:grid-cols-2 gap-4">
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-blue-600 mb-2 flex items-center gap-2"><DollarSign className="w-4 h-4"/> Валюта (₿)</h4>
                        <p className="text-sm text-slate-500">
                          Бюджет агентства. Используется для покупки каналов, оплаты налогов и ренты конкурентам.
                        </p>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <h4 className="font-bold text-yellow-600 mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4"/> Эффективность (E)</h4>
                        <p className="text-sm text-slate-500">
                           Показатель качества ваших кампаний (от 0 до 5). Влияет на доход при прохождении круга (+200₿ за каждый уровень E) и на результаты карточек "Бриф".
                        </p>
                     </div>
                  </section>

                  <section>
                    <h3 className="font-bold text-lg text-slate-800 mb-2">Механика Поля</h3>
                    <ul className="list-disc pl-5 space-y-2 text-slate-600">
                      <li><strong className="text-slate-800">Каналы (Цветные поля):</strong> Основной актив. Покупайте их, чтобы брать деньги с других игроков, когда они попадают на вашу клетку.</li>
                      <li><strong className="text-slate-800">Монополия:</strong> Соберите все каналы одного цвета, чтобы улучшать их (строить уровни) и повышать стоимость аренды.</li>
                      <li><strong className="text-slate-800">Бриф и Рынок:</strong> Случайные события. Могут принести прибыль или убытки.</li>
                      <li><strong className="text-slate-800">Кризис:</strong> Если вы попали на поле "Иди в Кризис", вы пропускаете ходы или платите штраф за выход.</li>
                    </ul>
                  </section>
                </div>

                <div className="mt-8 text-center">
                  <button onClick={() => setShowRulesModal(false)} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors">Понятно</button>
                </div>
             </div>
          </div>
        )}

      {/* Buy Modal */}
      {showBuyModal !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
             {CELLS[showBuyModal].data && (
               <>
                <div className="h-6 w-full" style={{ background: CELLS[showBuyModal].data?.color }}></div>
                <div className="p-6 text-center">
                  <div className="inline-block p-3 rounded-full bg-slate-50 mb-4 shadow-sm border border-slate-100">
                    <Sparkles className="w-8 h-8 text-yellow-500" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-1">{CELLS[showBuyModal].name}</h3>
                  <div className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-widest">{CELLS[showBuyModal].data?.groupId}</div>
                  
                  <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                     <div className="flex justify-between items-center mb-2">
                        <span className="text-slate-500 text-sm">Стоимость покупки</span>
                        <span className="font-bold text-lg text-slate-800">{CELLS[showBuyModal].data?.price}₿</span>
                     </div>
                     <div className="w-full h-px bg-slate-200 my-2"></div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-500 text-sm">Базовый доход</span>
                        <span className="font-bold text-slate-800 text-green-600">+{CELLS[showBuyModal].data?.baseRent}₿</span>
                     </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleBuy(showBuyModal)}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-blue-200 transition-transform active:scale-95"
                    >
                      Купить
                    </button>
                    <button 
                      onClick={() => setShowBuyModal(null)}
                      className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 py-3.5 rounded-xl font-bold transition-colors"
                    >
                      Пропустить
                    </button>
                  </div>
                </div>
               </>
             )}
          </div>
        </div>
      )}

      {/* Card Modal */}
      {activeCard && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center border-t-8 border-brand-accent relative overflow-hidden">
             {/* Decorative background icon */}
             <div className="absolute top-[-20px] right-[-20px] opacity-5 pointer-events-none">
                {activeCard.type === 'BRIEF' ? <Briefcase className="w-40 h-40"/> : <TrendingUp className="w-40 h-40"/>}
             </div>

             <div className="mb-6 flex justify-center relative z-10">
               <div className={`p-4 rounded-full ${activeCard.type === 'BRIEF' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                 {activeCard.type === 'BRIEF' ? <Briefcase className="w-10 h-10"/> : <TrendingUp className="w-10 h-10"/>}
               </div>
             </div>
             
             <div className="relative z-10">
               <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">
                  {activeCard.type === 'BRIEF' ? 'Входящий Бриф' : 'Новости Рынка'}
               </h4>
               <h3 className="text-2xl font-black text-slate-800 mb-4 leading-tight">{activeCard.title}</h3>
               <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                 <p className="text-slate-600 font-medium leading-relaxed">{activeCard.text}</p>
               </div>
               
               <button 
                 onClick={handleApplyCard}
                 className="w-full bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold shadow-lg transition-transform active:scale-95"
               >
                 Принять последствия
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Asset Management Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end md:items-center justify-center animate-fade-in">
          <div className="bg-white w-full md:max-w-3xl h-[85vh] md:h-auto md:max-h-[85vh] rounded-t-2xl md:rounded-2xl flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-2xl">
              <div>
                <h3 className="font-black text-xl text-slate-800">Портфель Каналов</h3>
                <p className="text-sm text-slate-500">Управляйте ставками и уровнями размещения</p>
              </div>
              <button onClick={() => setShowManageModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XCircle className="w-6 h-6 text-slate-400 hover:text-red-500" /></button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
               {currentPlayer.ownedProperties.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                    <LayoutGrid className="w-16 h-16 opacity-20" />
                    <p className="font-medium">У вас пока нет купленных каналов.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {currentPlayer.ownedProperties.map(cid => {
                     const cell = CELLS[cid];
                     const level = currentPlayer.propertyLevels[cid] || 0;
                     const canUpgrade = gameState.settings.uniformBuild 
                        ? hasMonopoly(currentPlayer.id, cell.data!.groupId, gameState.players) 
                        : true;
                     const groupColor = cell.data?.color;
                     
                     return (
                       <div key={cid} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-1 h-full" style={{background: groupColor}}></div>
                          
                          <div className="flex justify-between items-start mb-3 pl-2">
                            <div>
                               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{cell.data?.groupId}</div>
                               <h4 className="font-bold text-slate-800">{cell.name}</h4>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold mb-1">Уровень {level}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mb-3 pl-3">
                            <div>
                              <span className="block text-slate-400">Текущий доход</span>
                              <span className="font-bold text-green-600">{getRent(cell, level)}₿</span>
                            </div>
                            <div>
                              <span className="block text-slate-400">Цена улучшения</span>
                              <span className="font-bold text-slate-700">{cell.data?.buildCost}₿</span>
                            </div>
                          </div>

                          <div className="flex gap-2 pl-2">
                            <button 
                              disabled={!canUpgrade || currentPlayer.balance < (cell.data?.buildCost || 0) || level >= 5}
                              onClick={() => {
                                 if(currentPlayer.balance >= (cell.data?.buildCost || 0)) {
                                    updatePlayer(currentPlayer.id, {
                                      balance: currentPlayer.balance - (cell.data?.buildCost || 0),
                                      propertyLevels: { ...currentPlayer.propertyLevels, [cid]: level + 1 }
                                    });
                                 }
                              }}
                              className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                            >
                              <TrendingUp className="w-3 h-3" /> Улучшить
                            </button>
                            <button 
                              className="px-3 py-2 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-red-50 hover:text-red-500 transition-colors"
                              onClick={() => {
                                updatePlayer(currentPlayer.id, {
                                    balance: currentPlayer.balance + ((cell.data?.price || 0) * 0.5),
                                    ownedProperties: currentPlayer.ownedProperties.filter(id => id !== cid),
                                    propertyLevels: { ...currentPlayer.propertyLevels, [cid]: 0 }
                                });
                              }}
                            >
                              Продать
                            </button>
                          </div>
                          
                          {!canUpgrade && level < 5 && (
                             <div className="text-[10px] text-orange-500 mt-2 pl-2 flex items-center gap-1">
                               <Lock className="w-3 h-3" />
                               Нужно собрать всю категорию {cell.data?.groupId}
                             </div>
                          )}
                       </div>
                     )
                   })}
                 </div>
               )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}