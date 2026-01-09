import { Cell, CellType, ChannelGroup, Card, Player } from './types';

export const GROUPS: Record<ChannelGroup, string> = {
  Search: '#8d6e63', // Brown
  Social: '#4fc3f7', // Light Blue
  Video: '#ec407a', // Pink
  Influencers: '#ffa726', // Orange
  OOH: '#ef5350', // Red
  Audio: '#ffeb3b', // Yellow
  TV: '#66bb6a', // Green
  PR: '#42a5f5', // Blue
};

// Rent multiplier constants
const M = [1, 2, 3, 4, 6]; 

export const CELLS: Cell[] = [
  { id: 0, type: CellType.START, name: "Старт" },
  { id: 1, type: CellType.CHANNEL, name: "Yandex Direct", data: { groupId: 'Search', color: GROUPS.Search, price: 600, baseRent: 20, buildCost: 500, rentMultipliers: M } },
  { id: 2, type: CellType.MARKET, name: "Рынок" },
  { id: 3, type: CellType.CHANNEL, name: "Google Ads", data: { groupId: 'Search', color: GROUPS.Search, price: 600, baseRent: 40, buildCost: 500, rentMultipliers: M } },
  { id: 4, type: CellType.TAX, name: "НДС", taxAmount: 2000 },
  { id: 5, type: CellType.CHANNEL, name: "Programmatic", data: { groupId: 'Search', color: GROUPS.Search, price: 1000, baseRent: 50, buildCost: 500, rentMultipliers: M } }, // Added 3rd for group
  { id: 6, type: CellType.CHANNEL, name: "VK Ads", data: { groupId: 'Social', color: GROUPS.Social, price: 1000, baseRent: 60, buildCost: 500, rentMultipliers: M } },
  { id: 7, type: CellType.BRIEF, name: "Бриф" },
  { id: 8, type: CellType.CHANNEL, name: "Telegram Ads", data: { groupId: 'Social', color: GROUPS.Social, price: 1000, baseRent: 60, buildCost: 500, rentMultipliers: M } },
  { id: 9, type: CellType.CHANNEL, name: "Ok.ru", data: { groupId: 'Social', color: GROUPS.Social, price: 1200, baseRent: 80, buildCost: 500, rentMultipliers: M } },
  { id: 10, type: CellType.CRISIS, name: "Кризис / Блок" },
  { id: 11, type: CellType.CHANNEL, name: "YouTube", data: { groupId: 'Video', color: GROUPS.Video, price: 1400, baseRent: 100, buildCost: 1000, rentMultipliers: M } },
  { id: 12, type: CellType.CHANNEL, name: "RuTube", data: { groupId: 'Video', color: GROUPS.Video, price: 1400, baseRent: 100, buildCost: 1000, rentMultipliers: M } },
  { id: 13, type: CellType.CHANNEL, name: "Online Cinema", data: { groupId: 'Video', color: GROUPS.Video, price: 1600, baseRent: 120, buildCost: 1000, rentMultipliers: M } },
  { id: 14, type: CellType.CHANNEL, name: "Instagram Bloggers", data: { groupId: 'Influencers', color: GROUPS.Influencers, price: 1800, baseRent: 140, buildCost: 1000, rentMultipliers: M } },
  { id: 15, type: CellType.MARKET, name: "Рынок" },
  { id: 16, type: CellType.CHANNEL, name: "Twitch Streamers", data: { groupId: 'Influencers', color: GROUPS.Influencers, price: 1800, baseRent: 140, buildCost: 1000, rentMultipliers: M } },
  { id: 17, type: CellType.BRIEF, name: "Бриф" },
  { id: 18, type: CellType.CHANNEL, name: "TikTok Stars", data: { groupId: 'Influencers', color: GROUPS.Influencers, price: 2000, baseRent: 160, buildCost: 1000, rentMultipliers: M } },
  { id: 19, type: CellType.CHANNEL, name: "Podcasters", data: { groupId: 'Influencers', color: GROUPS.Influencers, price: 2000, baseRent: 160, buildCost: 1000, rentMultipliers: M } }, // Added 4th or moved logic
  { id: 20, type: CellType.FREE_PARKING, name: "Исследование" }, // Free Parking analog
  { id: 21, type: CellType.CHANNEL, name: "Billboards", data: { groupId: 'OOH', color: GROUPS.OOH, price: 2200, baseRent: 180, buildCost: 1500, rentMultipliers: M } },
  { id: 22, type: CellType.BRIEF, name: "Бриф" },
  { id: 23, type: CellType.CHANNEL, name: "City Formats", data: { groupId: 'OOH', color: GROUPS.OOH, price: 2200, baseRent: 180, buildCost: 1500, rentMultipliers: M } },
  { id: 24, type: CellType.CHANNEL, name: "Digital OOH", data: { groupId: 'OOH', color: GROUPS.OOH, price: 2400, baseRent: 200, buildCost: 1500, rentMultipliers: M } },
  { id: 25, type: CellType.CHANNEL, name: "Radio Energy", data: { groupId: 'Audio', color: GROUPS.Audio, price: 2600, baseRent: 220, buildCost: 1500, rentMultipliers: M } },
  { id: 26, type: CellType.CHANNEL, name: "Spotify Ads", data: { groupId: 'Audio', color: GROUPS.Audio, price: 2600, baseRent: 220, buildCost: 1500, rentMultipliers: M } },
  { id: 27, type: CellType.CHANNEL, name: "Yandex Music", data: { groupId: 'Audio', color: GROUPS.Audio, price: 2800, baseRent: 240, buildCost: 1500, rentMultipliers: M } },
  { id: 28, type: CellType.MARKET, name: "Рынок" },
  { id: 29, type: CellType.CHANNEL, name: "Podcasts Network", data: { groupId: 'Audio', color: GROUPS.Audio, price: 2800, baseRent: 240, buildCost: 1500, rentMultipliers: M } }, // Filler
  { id: 30, type: CellType.GOTO_CRISIS, name: "Иди в Кризис" },
  { id: 31, type: CellType.CHANNEL, name: "Federal TV", data: { groupId: 'TV', color: GROUPS.TV, price: 3000, baseRent: 260, buildCost: 2000, rentMultipliers: M } },
  { id: 32, type: CellType.CHANNEL, name: "Cable TV", data: { groupId: 'TV', color: GROUPS.TV, price: 3000, baseRent: 260, buildCost: 2000, rentMultipliers: M } },
  { id: 33, type: CellType.BRIEF, name: "Бриф" },
  { id: 34, type: CellType.CHANNEL, name: "Smart TV Ads", data: { groupId: 'TV', color: GROUPS.TV, price: 3200, baseRent: 280, buildCost: 2000, rentMultipliers: M } },
  { id: 35, type: CellType.CHANNEL, name: "Industry Events", data: { groupId: 'PR', color: GROUPS.PR, price: 3500, baseRent: 350, buildCost: 2000, rentMultipliers: M } },
  { id: 36, type: CellType.BRIEF, name: "Бриф" },
  { id: 37, type: CellType.CHANNEL, name: "PR Articles", data: { groupId: 'PR', color: GROUPS.PR, price: 3500, baseRent: 350, buildCost: 2000, rentMultipliers: M } },
  { id: 38, type: CellType.TAX, name: "Комиссия Агентства", taxAmount: 1000 },
  { id: 39, type: CellType.CHANNEL, name: "Special Projects", data: { groupId: 'PR', color: GROUPS.PR, price: 4000, baseRent: 500, buildCost: 2000, rentMultipliers: M } },
];

// Helper to safely clamp E
const clampE = (current: number, change: number) => Math.min(5, Math.max(0, current + change));

export const BRIEFS: Card[] = [
  { id: 1, type: 'BRIEF', title: "Запуск за 2 недели", text: "Срочный старт! Если есть Видео или Инфлюенсеры: +1200₿ и +1E. Иначе -600₿.", effect: (p, all, log) => {
    const hasAssets = p.ownedProperties.some(id => {
       const cell = CELLS.find(c => c.id === id);
       return cell?.data?.groupId === 'Video' || cell?.data?.groupId === 'Influencers';
    });
    if (hasAssets) {
        log("Успешный срочный запуск! +1200₿, +1E");
        return { balance: p.balance + 1200, efficiency: clampE(p.efficiency, 1) };
    }
    log("Не успели к запуску. -600₿");
    return { balance: p.balance - 600 };
  }},
  { id: 2, type: 'BRIEF', title: "Нужны лиды", text: "Клиент требует Performance. Если есть Поиск (Search): +1000₿. Иначе -1E.", effect: (p, all, log) => {
      const hasSearch = p.ownedProperties.some(id => CELLS.find(c => c.id === id)?.data?.groupId === 'Search');
      if (hasSearch) {
          log("Лиды есть! +1000₿");
          return { balance: p.balance + 1000 };
      }
      log("Лидов нет, клиент недоволен. -1E");
      return { efficiency: clampE(p.efficiency, -1) };
  }},
  { id: 3, type: 'BRIEF', title: "Креатив залетел", text: "Вирусный эффект! +600₿ и +1E.", effect: (p, all, log) => {
      log("Креатив стал вирусным!");
      return { balance: p.balance + 600, efficiency: clampE(p.efficiency, 1) };
  }},
  { id: 4, type: 'BRIEF', title: "Срыв сроков", text: "Продакшн подвел. Штраф -700₿.", effect: (p, all, log) => {
      log("Срыв сроков. Штраф.");
      return { balance: p.balance - 700 };
  }},
   { id: 5, type: 'BRIEF', title: "Клиент удвоил бюджет", text: "Выплата +1500₿!", effect: (p, all, log) => {
      log("Бюджет удвоен!");
      return { balance: p.balance + 1500 };
  }},
];

export const MARKETS: Card[] = [
  { id: 101, type: 'MARKET', title: "Сезон распродаж", text: "Рынок растет. Получите +800₿.", effect: (p, all, log) => {
      log("Сезон распродаж приносит доход.");
      return { balance: p.balance + 800 };
  }},
  { id: 102, type: 'MARKET', title: "Проверка маркировки", text: "Штрафы за отсутствие ERID. -600₿.", effect: (p, all, log) => {
      log("Штраф за маркировку рекламы.");
      return { balance: p.balance - 600 };
  }},
  { id: 103, type: 'MARKET', title: "Праздники", text: "Всем +500₿.", effect: (p, all, log) => {
      // Note: This needs to affect everyone, but current simple effect returns only partial player. 
      // Handled in component logic by checking 'globalEffect' flag or special logic.
      // For now, simpler implementation: active player gets bonus, we simulate others in App logic if needed.
      // Let's just give current player double to simplify or use the log.
      log("Праздничный бонус получен.");
      return { balance: p.balance + 500 };
  }},
  { id: 104, type: 'MARKET', title: "Алгоритмы изменились", text: "Охваты упали. -1E, но компенсация +500₿.", effect: (p, all, log) => {
      log("Смена алгоритмов.");
      return { balance: p.balance + 500, efficiency: clampE(p.efficiency, -1) };
  }},
  { id: 105, type: 'MARKET', title: "Антикризис", text: "Эту карту можно использовать, чтобы выйти из Кризиса.", effect: (p, all, log) => {
      log("Вы получили карту Антикризис!");
      return { hasAntiCrisis: true };
  }},
];