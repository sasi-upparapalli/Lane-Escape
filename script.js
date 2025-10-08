const screens = {
  entry: document.getElementById('screen-entry'),
  menu: document.getElementById('screen-menu'),
  levels: document.getElementById('screen-levels'),
  controls: document.getElementById('screen-controls'),
  about: document.getElementById('screen-about'),
  contact: document.getElementById('screen-contact'),
  game: document.getElementById('screen-game'),
};
function showScreen(name){
  Object.values(screens).forEach(s=>s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
  if(name==='game') document.getElementById('gameArea').focus();
}

let USERNAME = '';
let CURRENT_LEVEL = 1;
let GAME_RUNNING = false;
let GAME_PAUSED = false;
let SCORE = 0;
let HIGH_SCORE = 0;
let spawnTimer = null;
let lastTimeStamp = performance.now();
let opponents = [];
let LANE_POSITIONS = [];
let currentLane = 2;
let spawnCfg = null;

document.getElementById('btnEntryNext').addEventListener('click', ()=>{
  const v = (document.getElementById('usernameInput').value||'').trim() || 'Player';
  USERNAME = v;
  showScreen('menu');
});
document.getElementById('btnStart').addEventListener('click', ()=> showScreen('levels'));
document.getElementById('btnControls').addEventListener('click', ()=> showScreen('controls'));
document.getElementById('btnAbout').addEventListener('click', ()=> showScreen('about'));
document.getElementById('btnContact').addEventListener('click', ()=> showScreen('contact'));
document.getElementById('btnControlsBack').addEventListener('click', ()=> showScreen('menu'));
document.getElementById('btnAboutBack').addEventListener('click', ()=> showScreen('menu'));
document.getElementById('btnLevelBack').addEventListener('click', ()=> showScreen('menu'));
document.getElementById('btnContactBack').addEventListener('click', ()=> showScreen('menu'));

document.querySelectorAll('[data-level]').forEach(btn=>{
  btn.addEventListener('click', e=>{
    CURRENT_LEVEL = Number(e.currentTarget.dataset.level);
    startGameForLevel(CURRENT_LEVEL);
    showScreen('game');
  });
});

const PLAYER_IMAGES = ['assets/player1.png','assets/player2.png','assets/player3.png'];
const OPPONENT_IMAGES = ['assets/opponent1.png','assets/opponent2.png','assets/opponent3.png','assets/opponent4.png','assets/opponent5.png','assets/opponent6.png','assets/opponent7.png','assets/opponent8.png','assets/opponent9.png','assets/opponent10.png','assets/opponent11.png','assets/opponent12.png'];
document.querySelectorAll('[data-level]').forEach(btn=>{
  btn.addEventListener('click', e=>{
    CURRENT_LEVEL = Number(e.currentTarget.dataset.level);
    const playerImageIndex = CURRENT_LEVEL - 1;
    playerCar.src = PLAYER_IMAGES[playerImageIndex];
    startGameForLevel(CURRENT_LEVEL);
    showScreen('game');
  });
});
const LEVEL_CONFIG = {
  1:{opponentCount:4,speedMultiplier:1.45,spawnInterval:1500,maxOpponents:4},
  2:{opponentCount:5,speedMultiplier:1.45,spawnInterval:600,maxOpponents:5},
  3:{opponentCount:6,speedMultiplier:1.8,spawnInterval:600,maxOpponents:6}
};

const gameArea = document.getElementById('gameArea');
const playerCar = document.getElementById('playerCar');
const opponentsContainer = document.getElementById('opponentsContainer');
const hudUser = document.getElementById('hudUser');
const hudScore = document.getElementById('hudScore');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const finalScoreText = document.getElementById('finalScoreText');

const GAME_WIDTH = ()=> gameArea.clientWidth;
const GAME_HEIGHT = ()=> gameArea.clientHeight;

function computeLanes(){
  const laneCount = 5;
  const w = GAME_WIDTH();
  const playerW = parseFloat(getComputedStyle(playerCar).width) || 56;
  const padding = playerW/2 + 12;
  const available = Math.max(80, w - padding*2);
  const step = available / (laneCount - 1);
  const lanes = [];
  for(let i=0;i<laneCount;i++){
    lanes.push(Math.round(padding + i*step));
  }
  return lanes;
}

function positionPlayer(){
  const lanes = LANE_POSITIONS;
  const playerW = parseFloat(getComputedStyle(playerCar).width) || 56;
  const cx = lanes[currentLane] || (GAME_WIDTH()/2);
  const leftPx = Math.max(6, Math.min(GAME_WIDTH()-playerW-6, Math.round(cx - playerW/2)));
  playerCar.style.left = leftPx + 'px';
}
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');

if (btnLeft && btnRight) {
  btnLeft.addEventListener('touchstart', () => {
    if (!GAME_RUNNING || GAME_PAUSED) return;
    currentLane = Math.max(0, currentLane - 1);
    positionPlayer();
  });

  btnRight.addEventListener('touchstart', () => {
    if (!GAME_RUNNING || GAME_PAUSED) return;
    currentLane = Math.min(LANE_POSITIONS.length - 1, currentLane + 1);
    positionPlayer();
  });
}

window.addEventListener('resize', ()=>{ LANE_POSITIONS = computeLanes(); positionPlayer(); });

window.addEventListener('keydown', (e)=>{
  if(!GAME_RUNNING) return;
  if(e.key === 'ArrowLeft'){ currentLane = Math.max(0, currentLane-1); positionPlayer(); }
  if(e.key === 'ArrowRight'){ currentLane = Math.min(LANE_POSITIONS.length-1, currentLane+1); positionPlayer(); }
  if(e.key === 'p' || e.key === 'P'){ togglePause(); }
});
gameArea.addEventListener('click', ()=> gameArea.focus());

function spawnOpponent(){
  if(!GAME_RUNNING) return;
  const cfg = spawnCfg || LEVEL_CONFIG[CURRENT_LEVEL];
  if(opponents.length >= cfg.maxOpponents) return;

  const lanes = LANE_POSITIONS.length ? LANE_POSITIONS : computeLanes();
  const availableLanes = [];
  const SPAWN_CHECK_DISTANCE = 160;

  for (let i = 0; i < lanes.length; i++) {
    const isOccupied = opponents.some(o => 
      o.laneIndex === i && o.y < SPAWN_CHECK_DISTANCE
    );
    if (!isOccupied) {
      availableLanes.push(i);
    }
  }

  if (availableLanes.length === 0) {
    return;
  }

  const laneIndex = availableLanes[Math.floor(Math.random() * availableLanes.length)];
  const laneCx = lanes[laneIndex];
  const opponentEl = document.createElement('img');
  opponentEl.className = 'opponent';
  opponentEl.src = OPPONENT_IMAGES[Math.floor(Math.random()*OPPONENT_IMAGES.length)] || OPPONENT_IMAGES[0];
  const opW = parseFloat(getComputedStyle(opponentEl).width) || parseFloat(getComputedStyle(playerCar).width) || 56;
  opponentsContainer.appendChild(opponentEl);
  const finalOpW = parseFloat(getComputedStyle(opponentEl).width) || opW;
  const leftPx = Math.max(6, Math.min(GAME_WIDTH()-finalOpW-6, Math.round(laneCx - finalOpW/2)));
  opponentEl.style.left = leftPx + 'px';
  opponentEl.style.top = (-140 - Math.random()*120) + 'px';
  const baseSpeed = 80 + Math.random()*60;
  const speed = baseSpeed * cfg.speedMultiplier;
  opponents.push({el:opponentEl, speed, laneIndex, y: parseFloat(opponentEl.style.top) });
  if(opponents.length > cfg.maxOpponents + 2){
    const oldest = opponents.shift();
    try{ oldest.el.remove(); }catch(e){}
  }
}

function clearOpponents(){
  opponents.forEach(o=>{ try{o.el.remove();}catch(e){} });
  opponents = [];
}

function startSpawning(){
  stopSpawning();
  const cfg = LEVEL_CONFIG[CURRENT_LEVEL];
  spawnCfg = cfg;
  spawnTimer = setInterval(spawnOpponent, cfg.spawnInterval);
}
function stopSpawning(){
  if(spawnTimer){ clearInterval(spawnTimer); spawnTimer = null; }
}

function startGameForLevel(level){
  resetGameState();
  CURRENT_LEVEL = level;
  hudUser.innerHTML = '<i class="fa fa-user-circle-o" aria-hidden="true"></i> ' + (USERNAME || 'Player');  SCORE = 0;
  HIGH_SCORE = getHighScoreForUserAndLevel();
  updateHUD();
  LANE_POSITIONS = computeLanes();
  currentLane = Math.floor(LANE_POSITIONS.length/2);
  positionPlayer();
  showScreen('game');
  GAME_RUNNING = true;
  GAME_PAUSED = false;
  lastTimeStamp = performance.now();
  clearOpponents();
  const initial = Math.min(2, LEVEL_CONFIG[level].maxOpponents);
  for(let i=0;i<initial;i++) spawnOpponent();
  startSpawning();
  requestAnimationFrame(gameLoop);
}
function stopGameLoop(){
  GAME_RUNNING = false;
  stopSpawning();
}

document.getElementById('btnPause').addEventListener('click', togglePause);
function togglePause(){
  if(!GAME_RUNNING) return;
  GAME_PAUSED = !GAME_PAUSED;
  document.getElementById('btnPause').innerHTML = GAME_PAUSED ? '<i class="fa fa-play fa-2x" aria-hidden="true"></i>' : '<i class="fa fa-pause fa-2x" aria-hidden="true"></i>';
  if(GAME_PAUSED){
    stopSpawning();
  } else {
    lastTimeStamp = performance.now();
    startSpawning();
    requestAnimationFrame(gameLoop);
  }
}

document.getElementById('btnExit').addEventListener('click', ()=>{
  stopGameLoop();
  clearOpponents();
  showScreen('menu');
});

document.getElementById('btnRestart').addEventListener('click', ()=>{
  gameOverOverlay.style.display = 'none';
  startGameForLevel(CURRENT_LEVEL);
});
document.getElementById('btnHome').addEventListener('click', ()=>{
  gameOverOverlay.style.display = 'none';
  stopGameLoop();
  clearOpponents();
  showScreen('menu');
});

function updateHUD() {
    hudScore.innerHTML = `<i class="fa fa-star-half-o" aria-hidden="true"></i> Score: ${Math.floor(SCORE)} <br> <i class="fa fa-star-o" aria-hidden="true"></i>  High: ${Math.floor(HIGH_SCORE)}`;
}
function highScoreKey(){ return `carGame_high_${(USERNAME||'player').replace(/\s+/g,'_')}_lvl${CURRENT_LEVEL}`; }
function getHighScoreForUserAndLevel(){ const v=localStorage.getItem(highScoreKey()); return v?Number(v):0; }
function setHighScoreForUserAndLevel(score){ localStorage.setItem(highScoreKey(), String(Math.floor(score))); }

function rectsOverlap(r1,r2){
  return !(r2.right < r1.left || r1.right < r2.left || r2.bottom < r1.top || r2.top > r1.bottom);
}

function gameLoop(now){
  if(!GAME_RUNNING || GAME_PAUSED) return;
  const dt = (now - lastTimeStamp)/1000;
  lastTimeStamp = now;
  for(let i=opponents.length-1;i>=0;i--){
    const o = opponents[i];
    o.y += o.speed * dt;
    o.el.style.top = o.y + 'px';
    if(o.y > GAME_HEIGHT() + 120){
      try{o.el.remove();}catch(e){}
      opponents.splice(i,1);
      continue;
    }
    const playerRect = playerCar.getBoundingClientRect();
    const opRect = o.el.getBoundingClientRect();
    if(rectsOverlap(playerRect, opRect)){
      handleGameOver();
      return;
    }
  }
  SCORE += dt * (10 * (LEVEL_CONFIG[CURRENT_LEVEL].speedMultiplier || 1));
  if(SCORE > HIGH_SCORE) HIGH_SCORE = SCORE;
  updateHUD();
  requestAnimationFrame(gameLoop);
}

function handleGameOver(){
  stopGameLoop();
  const prev = getHighScoreForUserAndLevel();
  if(SCORE > prev) setHighScoreForUserAndLevel(SCORE);
  finalScoreText.textContent = `Final score: ${Math.floor(SCORE)}`;
  HIGH_SCORE = getHighScoreForUserAndLevel();
  updateHUD();
  gameOverOverlay.style.display = 'flex';
}

function resetGameState(){
  SCORE = 0;
  document.getElementById('btnPause').innerHTML = '<i class="fa fa-pause fa-2x" aria-hidden="true"></i>';
  currentLane = 2;
  LANE_POSITIONS = computeLanes();
}

(function renderCenterLines(){
  const centerLines = document.getElementById('centerLines');
  centerLines.innerHTML = '';
  const count = 12;
  for(let i=0;i<count;i++){ const d=document.createElement('div'); centerLines.appendChild(d); }
})();

document.addEventListener('touchmove', e=>{ e.preventDefault(); }, {passive:false});

showScreen('entry');
