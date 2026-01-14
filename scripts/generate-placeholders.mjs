import fs from 'fs';
import path from 'path';

const INITIAL_CARD_PROFILES = [
    { id: "op01-001", name: "Monkey.D.Luffy", set: "Romance Dawn", rarity: "L", cardNumber: "OP01-001" },
    { id: "op01-016", name: "Nami", set: "Romance Dawn", rarity: "R", cardNumber: "OP01-016" },
    { id: "op01-024", name: "Kozuki Momonosuke", set: "Romance Dawn", rarity: "UC", cardNumber: "OP01-024" },
    { id: "op01-047", name: "Trafalgar Law", set: "Romance Dawn", rarity: "SR", cardNumber: "OP01-047" },
    { id: "op01-070", name: "Dracule Mihawk", set: "Romance Dawn", rarity: "SR", cardNumber: "OP01-070" },
    { id: "op01-120", name: "Shanks", set: "Romance Dawn", rarity: "SEC", cardNumber: "OP01-120" },
    { id: "op02-001", name: "Edward.Newgate", set: "Paramount War", rarity: "L", cardNumber: "OP02-001" },
    { id: "op02-013", name: "Portgas.D.Ace", set: "Paramount War", rarity: "SR", cardNumber: "OP02-013" },
    { id: "op02-036", name: "Nami", set: "Paramount War", rarity: "SR", cardNumber: "OP02-036" },
    { id: "op02-121", name: "Kuzan", set: "Paramount War", rarity: "SEC", cardNumber: "OP02-121" },
    { id: "op03-001", name: "Portgas.D.Ace", set: "Pillars of Strength", rarity: "L", cardNumber: "OP03-001" },
    { id: "op03-022", name: "Arlong", set: "Pillars of Strength", rarity: "L", cardNumber: "OP03-022" },
    { id: "op03-122", name: "Sogeking", set: "Pillars of Strength", rarity: "SEC", cardNumber: "OP03-122" },
    { id: "op04-001", name: "Donquixote Doflamingo", set: "Kingdoms of Intrigue", rarity: "L", cardNumber: "OP04-001" },
    { id: "op04-083", name: "Rebecca", set: "Kingdoms of Intrigue", rarity: "L", cardNumber: "OP04-083" },
    { id: "op05-001", name: "Sabo", set: "Awakening of the New Era", rarity: "L", cardNumber: "OP05-001" },
    { id: "op05-060", name: "Monkey.D.Luffy", set: "Awakening of the New Era", rarity: "L", cardNumber: "OP05-060" },
    { id: "op05-118", name: "Kaido", set: "Awakening of the New Era", rarity: "SEC", cardNumber: "OP05-118" },
    { id: "op05-119", name: "Monkey.D.Luffy", set: "Awakening of the New Era", rarity: "SEC", cardNumber: "OP05-119" },
    { id: "op06-001", name: "Uta", set: "Wings of the Captain", rarity: "L", cardNumber: "OP06-001" },
    { id: "op06-022", name: "Yamato", set: "Wings of the Captain", rarity: "L", cardNumber: "OP06-022" },
    { id: "op06-086", name: "Gecko Moria", set: "Wings of the Captain", rarity: "SR", cardNumber: "OP06-086" },
    { id: "st01-001", name: "Monkey.D.Luffy", set: "Straw Hat Crew Starter Deck", rarity: "L", cardNumber: "ST01-001" },
    { id: "st01-012", name: "Roronoa Zoro", set: "Straw Hat Crew Starter Deck", rarity: "SR", cardNumber: "ST01-012" },
    { id: "st10-001", name: "Trafalgar Law", set: "Three Captains Starter Deck", rarity: "L", cardNumber: "ST10-001" },
    { id: "eb01-001", name: "Hannyabal", set: "Extra Booster Memorial Collection", rarity: "L", cardNumber: "EB01-001" },
    { id: "op07-001", name: "Monkey.D.Dragon", set: "500 Years into the Future", rarity: "L", cardNumber: "OP07-001" },
    { id: "op07-109", name: "Boa Hancock", set: "500 Years into the Future", rarity: "SR", cardNumber: "OP07-109" },
    { id: "op08-001", name: "Tony Tony Chopper", set: "Two Legends", rarity: "L", cardNumber: "OP08-001" },
    { id: "op08-118", name: "Silvers Rayleigh", set: "Two Legends", rarity: "SEC", cardNumber: "OP08-118" }
];

const colors = {
    'L': '#f1c40f',
    'SEC': '#9b59b6',
    'SR': '#e67e22',
    'R': '#3498db',
    'UC': '#2ecc71',
    'C': '#bdc3c7'
};

const getSvg = (card) => {
    const color = colors[card.rarity] || '#7f8c8d';
    return `<svg width="400" height="560" viewBox="0 0 400 560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cardGrad-${card.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2c3e50;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect x="10" y="10" width="380" height="540" rx="20" fill="url(#cardGrad-${card.id})" stroke="${color}" stroke-width="4" />
  <rect x="30" y="60" width="340" height="300" rx="10" fill="#34495e" />
  <circle cx="200" cy="180" r="80" fill="${color}" opacity="0.1" />
  <text x="50%" y="220" font-family="Arial, sans-serif" font-size="60" fill="${color}" opacity="0.2" text-anchor="middle" font-weight="bold">${card.name.charAt(0)}</text>
  
  <text x="40" y="45" font-family="Arial, sans-serif" font-size="22" fill="${color}" font-weight="bold">${card.name}</text>
  <text x="360" y="45" font-family="Arial, sans-serif" font-size="18" fill="white" text-anchor="end">${card.rarity}</text>
  
  <rect x="30" y="380" width="340" height="120" rx="5" fill="#1a1a1a" stroke="${color}" stroke-width="1" />
  <text x="45" y="410" font-family="Arial, sans-serif" font-size="14" fill="#bdc3c7">${card.set}</text>
  <text x="45" y="440" font-family="Arial, sans-serif" font-size="16" fill="white" font-weight="bold">${card.cardNumber}</text>
  
  <circle cx="350" cy="520" r="15" fill="${color}" />
  <text x="350" y="525" font-family="Arial, sans-serif" font-size="12" fill="black" text-anchor="middle" font-weight="bold">OP</text>
</svg>`;
};

const outputDir = path.join(process.cwd(), 'public/cards');
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

INITIAL_CARD_PROFILES.forEach(card => {
    const filename = `${card.id}.svg`;
    fs.writeFileSync(path.join(outputDir, filename), getSvg(card));
    console.log(`Generated ${filename}`);
});
