// ========================================
// 게임 상수
// ========================================

const CORRECT_SCORE = 10;
const WRONG_SCORE_PENALTY = 5;

const WRONG_TIME_PENALTY = 5;   // 오답 시 시간 감소
const COMBO_TARGET = 3;         // 이만큼 연속 정답을 맞히면 콤보 보너스 발동
const COMBO_TIME_BONUS = 6;     // 콤보 보너스로 늘어나는 시간

const CHAR_EFFECTS = ['', 'effect-spin', 'effect-scale', 'effect-faint'];

// 점수 구간별로 시각 효과가 등장하는 빈도를 점점 높인다 (난이도 곡선)
// 100점 구간이 예전의 EFFECT_ALWAYS_ON_SCORE=50 을 대체/흡수한다
const EFFECT_TIERS = [
    { minScore: 0,   noEffectAllowed: true,  fastAnim: false },
    { minScore: 50,  noEffectAllowed: true,  fastAnim: false },
    { minScore: 100, noEffectAllowed: false, fastAnim: false },
    { minScore: 200, noEffectAllowed: false, fastAnim: true },
];

const HISTORY_KEY = 'typingQuestHistory';
const HISTORY_LIMIT = 5;

const BEST_SCORE_KEY = 'typingQuestBestScore';
const SOUND_ENABLED_KEY = 'typingQuestSoundEnabled';

const RANK_THRESHOLDS = [
    { min: 300, rank: 'S' },
    { min: 200, rank: 'A' },
    { min: 100, rank: 'B' },
    { min: 50, rank: 'C' },
    { min: 0, rank: 'D' },
];

const BONUS_SCORE = 25;
const BONUS_TIME_BONUS = 3;
const TRAP_PENALTY_SCORE = 10;
const TRAP_PENALTY_TIME = 5;
const TRAP_DEFUSE_TIME_BONUS = 2;

const DIFFICULTY_SETTINGS = {
    easy: { startTime: 25, bonusChance: 0.16, trapChance: 0.05 },
    normal: { startTime: 20, bonusChance: 0.12, trapChance: 0.10 },
    hard: { startTime: 15, bonusChance: 0.08, trapChance: 0.16 },
};

const COUNTDOWN_STEPS = ['READY', '3', '2', '1', 'GO!'];
const COUNTDOWN_STEP_MS = 550;

// ========================================
// 게임 상태를 관리하는 변수
// ========================================

let score = 0;
let timeLeft = 20;
let comboCount = 0;
let currentSpecial = 'normal'; // 'normal' | 'bonus' | 'trap'
let difficulty = 'normal';

let bestScore = 0;
let soundEnabled = true;
let audioContext = null;

let gameInterval;
let countdownTimeoutId = null;
let isGameRunning = false;
let isCountingDown = false;

// ========================================
// DOM 요소 참조
// ========================================

const targetCharElement = document.getElementById('targetChar');
const charTypeElement = document.getElementById('charType');
const stageElement = document.getElementById('stage');
const popupElement = document.getElementById('popup');
const scorePopupElement = document.getElementById('scorePopup');

const scoreElement = document.getElementById('score');
const bestScoreElement = document.getElementById('bestScore');
const timerElement = document.getElementById('timer');
const comboElement = document.getElementById('combo');
const comboPanelElement = document.getElementById('comboPanel');

const messageElement = document.getElementById('message');
const rankBadgeElement = document.getElementById('rankBadge');
const historyListElement = document.getElementById('historyList');

const soundButtonElement = document.getElementById('soundButton');
const difficultyButtons = document.querySelectorAll('.diff-btn');

// ========================================
// 랜덤 문자 생성 / 종류 판별
// ========================================

function getRandomChar() {
    // 대문자 + 소문자 + 숫자
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
}

function getCharType(char) {
    if (/[0-9]/.test(char)) return 'number';
    if (char === char.toUpperCase()) return 'upper';
    return 'lower';
}

const CHAR_TYPE_LABEL = {
    upper: '대문자',
    lower: '소문자',
    number: '숫자',
};

// 문자 종류에 맞는 색깔 클래스 + 라벨을 입힌다
function applyCharType(char) {
    targetCharElement.classList.remove('type-upper', 'type-lower', 'type-number');
    charTypeElement.classList.remove('type-upper', 'type-lower', 'type-number');

    const type = getCharType(char);
    const typeClass = `type-${type}`;

    targetCharElement.classList.add(typeClass);
    charTypeElement.classList.add(typeClass);
    charTypeElement.textContent = `[ ${CHAR_TYPE_LABEL[type]} ]`;
}

// 보너스 / 함정 여부를 난이도별 확률로 결정한다
function rollSpecial() {
    const settings = DIFFICULTY_SETTINGS[difficulty];
    const roll = Math.random();

    if (roll < settings.trapChance) return 'trap';
    if (roll < settings.trapChance + settings.bonusChance) return 'bonus';
    return 'normal';
}

// 보너스 / 함정 문자에 특별한 색과 라벨을 입힌다 (대소문자 색상 위에 덧씌움)
function applySpecialVisuals(special) {
    targetCharElement.classList.remove('char-bonus', 'char-trap');
    charTypeElement.classList.remove('label-bonus', 'label-trap');

    if (special === 'bonus') {
        targetCharElement.classList.add('char-bonus');
        charTypeElement.classList.add('label-bonus');
        charTypeElement.textContent = '[ 보너스! ]';
    } else if (special === 'trap') {
        targetCharElement.classList.add('char-trap');
        charTypeElement.classList.add('label-trap');
        charTypeElement.textContent = '[ 피하세요! SPACE ]';
    }
}

// 현재 점수에 맞는 효과 등급을 찾는다 (점수가 높을수록 더 자주/빠르게)
function getEffectTier(currentScore) {
    let tier = EFFECT_TIERS[0];
    for (const candidate of EFFECT_TIERS) {
        if (currentScore >= candidate.minScore) {
            tier = candidate;
        }
    }
    return tier;
}

function clearEffectClasses() {
    targetCharElement.classList.remove('effect-spin', 'effect-scale', 'effect-faint', 'effect-fast');
}

// 회전 / 크기 변화 / 희미한 깜빡임 중 하나를 랜덤으로 입힌다
function applyRandomEffect() {
    clearEffectClasses();

    const tier = getEffectTier(score);
    const pool = tier.noEffectAllowed ? CHAR_EFFECTS : CHAR_EFFECTS.filter(effect => effect !== '');
    const effect = pool[Math.floor(Math.random() * pool.length)];

    if (effect) {
        targetCharElement.classList.add(effect);
        if (tier.fastAnim) {
            targetCharElement.classList.add('effect-fast');
        }
    }
}

// 타겟 문자에 남아있는 색깔 / 효과 / 보너스·함정 클래스를 모두 지운다
function clearCharVisuals() {
    targetCharElement.classList.remove(
        'type-upper', 'type-lower', 'type-number',
        'effect-spin', 'effect-scale', 'effect-faint', 'effect-fast',
        'char-bonus', 'char-trap'
    );
    charTypeElement.classList.remove('type-upper', 'type-lower', 'type-number', 'label-bonus', 'label-trap');
    charTypeElement.textContent = '';

    popupElement.classList.remove('show');
    scorePopupElement.classList.remove('show');

    currentSpecial = 'normal';
}

// ========================================
// 새로운 타겟 문자 설정
// ========================================

function setNewTargetChar() {
    const newChar = getRandomChar();
    targetCharElement.innerText = newChar;

    currentSpecial = rollSpecial();

    applyCharType(newChar);
    applySpecialVisuals(currentSpecial);

    // 함정 문자는 회전/크기/깜빡임 효과 없이 또렷하게 보여줘야 공정하다
    if (currentSpecial === 'trap') {
        clearEffectClasses();
    } else {
        applyRandomEffect();
    }
}

// ========================================
// 정답 / 오답 시 스테이지 효과
// ========================================

function flashStage(isCorrect) {
    const flashClass = isCorrect ? 'flash-correct' : 'flash-wrong';
    stageElement.classList.add(flashClass);
    setTimeout(() => stageElement.classList.remove(flashClass), 150);

    if (!isCorrect) {
        stageElement.classList.remove('shake');
        void stageElement.offsetWidth;
        stageElement.classList.add('shake');
    }
}

// 팝업 텍스트를 하나의 엘리먼트에 띄우는 공용 함수
function triggerPopup(element, text, color) {
    element.textContent = text;
    element.style.color = color;
    element.classList.remove('show');
    void element.offsetWidth;
    element.classList.add('show');
}

// 콤보 보너스 / 콤보 브레이크 / 신기록처럼 상단에 뜨는 배너 팝업
function showPopup(text, color) {
    triggerPopup(popupElement, text, color);
}

// 매 타격마다 문자 근처에 뜨는 점수 변화 팝업
function showScorePopup(text, color) {
    triggerPopup(scorePopupElement, text, color);
}

// 콤보 패널이 살짝 튀는 느낌을 주는 효과
function pulseCombo() {
    comboPanelElement.classList.remove('combo-pulse');
    void comboPanelElement.offsetWidth;
    comboPanelElement.classList.add('combo-pulse');
}

// ========================================
// 사운드 (Web Audio API로 직접 합성, 외부 음원 파일 없음)
// ========================================

function initAudio() {
    if (audioContext) {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    audioContext = new AudioContextClass();
}

function playTone(freq, duration, type, gainPeak, delay) {
    if (!soundEnabled || !audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = freq;

    const startTime = audioContext.currentTime + (delay || 0);
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
}

function playCorrectSound() {
    playTone(660, 0.08, 'square', 0.12, 0);
    playTone(880, 0.1, 'square', 0.12, 0.06);
}

function playWrongSound() {
    playTone(180, 0.18, 'sawtooth', 0.15, 0);
}

function playComboSound() {
    playTone(660, 0.1, 'triangle', 0.14, 0);
    playTone(880, 0.1, 'triangle', 0.14, 0.08);
    playTone(1100, 0.14, 'triangle', 0.16, 0.16);
}

function playGameOverSound() {
    playTone(520, 0.15, 'square', 0.12, 0);
    playTone(390, 0.15, 'square', 0.12, 0.14);
    playTone(260, 0.25, 'square', 0.12, 0.28);
}

function toggleSound() {
    soundEnabled = !soundEnabled;

    try {
        localStorage.setItem(SOUND_ENABLED_KEY, soundEnabled ? '1' : '0');
    } catch (error) {
        // localStorage를 사용할 수 없는 환경이면 화면 표시만 갱신한다
    }

    updateSoundButton();
}

function updateSoundButton() {
    soundButtonElement.textContent = soundEnabled ? 'SOUND: ON' : 'SOUND: OFF';
    soundButtonElement.classList.toggle('muted', !soundEnabled);
}

// ========================================
// 최근 5번의 점수 기록 (localStorage에 저장)
// ========================================

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function renderHistory(history) {
    historyListElement.innerHTML = '';

    if (history.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.className = 'empty';
        emptyItem.textContent = '아직 기록이 없어요';
        historyListElement.appendChild(emptyItem);
        return;
    }

    history.forEach((historyScore, index) => {
        const item = document.createElement('li');
        item.innerHTML = `<span class="rank">${index + 1}.</span><span>${historyScore}점</span>`;
        historyListElement.appendChild(item);
    });
}

// 게임이 끝날 때마다 최종 점수를 기록 맨 앞에 추가하고, 최근 5개만 남긴다
function addScoreToHistory(finalScore) {
    const history = loadHistory();
    history.unshift(finalScore);
    const trimmed = history.slice(0, HISTORY_LIMIT);

    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    } catch (error) {
        // localStorage를 사용할 수 없는 환경이면 화면 표시만 갱신한다
    }

    renderHistory(trimmed);
}

// ========================================
// 최고 기록 & 랭크
// ========================================

function loadBestScore() {
    try {
        const raw = localStorage.getItem(BEST_SCORE_KEY);
        return raw ? Number(raw) || 0 : 0;
    } catch (error) {
        return 0;
    }
}

function saveBestScore(value) {
    try {
        localStorage.setItem(BEST_SCORE_KEY, String(value));
    } catch (error) {
        // localStorage를 사용할 수 없는 환경이면 화면 표시만 갱신한다
    }
}

function updateBestScoreDisplay() {
    bestScoreElement.textContent = `BEST ${bestScore}`;
}

function computeRank(finalScore) {
    const match = RANK_THRESHOLDS.find(entry => finalScore >= entry.min);
    return match ? match.rank : 'D';
}

function showRank(rank) {
    rankBadgeElement.textContent = `RANK ${rank}`;
    rankBadgeElement.className = `rank-badge rank-${rank}`;
}

function clearRankBadge() {
    rankBadgeElement.textContent = '';
    rankBadgeElement.className = 'rank-badge';
    bestScoreElement.classList.remove('new-record');
}

// ========================================
// 난이도 선택
// ========================================

function selectDifficulty(level) {
    if (isGameRunning || isCountingDown) return;

    difficulty = level;

    difficultyButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === level);
    });

    timeLeft = DIFFICULTY_SETTINGS[level].startTime;
    updateDisplay();
}

function setDifficultyButtonsDisabled(disabled) {
    difficultyButtons.forEach(btn => {
        btn.disabled = disabled;
    });
}

// ========================================
// 점수 / 콤보 / 시간 화면 업데이트
// ========================================

function updateDisplay() {
    scoreElement.innerText = `점수: ${score}`;
    timerElement.innerText = `남은 시간: ${timeLeft}`;
    comboElement.innerText = `${comboCount} / ${COMBO_TARGET}`;

    timerElement.classList.toggle('low-time', timeLeft <= 5);
    comboPanelElement.classList.toggle('combo-active', comboCount > 0);
}

// ========================================
// 키보드 입력 확인
// ========================================

function checkInput(event) {
    // Shift, Enter, CapsLock 등 한 글자가 아닌 키는 무시한다 (Space는 길이 1이라 통과된다)
    if (event.key.length !== 1) {
        return;
    }

    if (event.key === ' ') {
        event.preventDefault();
    }

    // ====================================
    // 함정 문자 처리: SPACE로 해체, 문자를 그대로 입력하면 페널티
    // ====================================
    if (currentSpecial === 'trap') {
        if (event.key === ' ') {
            timeLeft += TRAP_DEFUSE_TIME_BONUS;

            flashStage(true);
            playCorrectSound();
            showScorePopup('DEFUSED!', '#4cc9f0');
            updateDisplay();

            if (timeLeft <= 0) {
                endGame();
                return;
            }
            setNewTargetChar();
            return;
        }

        if (event.key === targetCharElement.innerText) {
            score = Math.max(0, score - TRAP_PENALTY_SCORE);
            timeLeft -= TRAP_PENALTY_TIME;
            comboCount = 0;

            flashStage(false);
            playWrongSound();
            showScorePopup(`-${TRAP_PENALTY_SCORE}`, '#ff2e63');
            updateDisplay();

            if (timeLeft <= 0) {
                endGame();
                return;
            }
            setNewTargetChar();
            return;
        }

        // 함정과 관련 없는 키 입력은 아무 효과 없이 무시한다
        return;
    }

    // ====================================
    // 일반 / 보너스 문자 처리 (대소문자를 구분해서 정확히 일치할 때만 정답)
    // ====================================
    const isCorrect = event.key === targetCharElement.innerText;

    if (isCorrect) {
        const gainedScore = currentSpecial === 'bonus' ? BONUS_SCORE : CORRECT_SCORE;
        const gainedTime = currentSpecial === 'bonus' ? BONUS_TIME_BONUS : 0;

        score += gainedScore;
        timeLeft += gainedTime;
        comboCount++;

        pulseCombo();
        playCorrectSound();
        showScorePopup(`+${gainedScore}`, currentSpecial === 'bonus' ? '#ffe066' : '#00ff41');

        // 3번 연속으로 맞혔을 때만 시간이 늘어난다
        if (comboCount >= COMBO_TARGET) {
            timeLeft += COMBO_TIME_BONUS;
            showPopup(`+${COMBO_TIME_BONUS} SEC!`, '#00ff41');
            playComboSound();
            comboCount = 0;
        }
    } else {
        score = Math.max(0, score - WRONG_SCORE_PENALTY);
        timeLeft -= WRONG_TIME_PENALTY;

        playWrongSound();
        showScorePopup(`-${WRONG_SCORE_PENALTY}`, '#ff2e63');

        if (comboCount > 0) {
            showPopup('COMBO BREAK!', '#ff2e63');
        }
        comboCount = 0;
    }

    flashStage(isCorrect);
    updateDisplay();

    if (timeLeft <= 0) {
        endGame();
        return;
    }

    setNewTargetChar();
}

// ========================================
// 타이머 업데이트
// ========================================

function updateTimer() {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
        endGame();
    }
}

// ========================================
// 게임 종료
// ========================================

function endGame() {
    clearInterval(gameInterval);
    clearTimeout(countdownTimeoutId);

    targetCharElement.innerText = '';
    clearCharVisuals();

    timeLeft = 0;
    comboCount = 0;
    updateDisplay();

    messageElement.innerText = `시간 초과! 최종 점수: ${score}`;

    if (score > bestScore) {
        bestScore = score;
        saveBestScore(bestScore);
        bestScoreElement.classList.add('new-record');
        showPopup('NEW RECORD!', '#ffe066');
    }
    updateBestScoreDisplay();

    showRank(computeRank(score));
    playGameOverSound();
    addScoreToHistory(score);

    document.removeEventListener('keydown', checkInput);
    isGameRunning = false;
    isCountingDown = false;
    setDifficultyButtonsDisabled(false);
}

// ========================================
// 시작 연출 (READY 3·2·1 GO!)
// ========================================

function runCountdown(onComplete) {
    let stepIndex = 0;

    function showStep() {
        const step = COUNTDOWN_STEPS[stepIndex];

        targetCharElement.className = '';
        targetCharElement.innerText = step;
        void targetCharElement.offsetWidth;
        targetCharElement.classList.add('countdown-step');

        stepIndex++;

        if (stepIndex < COUNTDOWN_STEPS.length) {
            countdownTimeoutId = setTimeout(showStep, COUNTDOWN_STEP_MS);
        } else {
            countdownTimeoutId = setTimeout(() => {
                isCountingDown = false;
                targetCharElement.className = '';
                onComplete();
            }, COUNTDOWN_STEP_MS);
        }
    }

    showStep();
}

// ========================================
// 게임 시작
// ========================================

function beginRound() {
    isGameRunning = true;
    setNewTargetChar();

    gameInterval = setInterval(updateTimer, 1000);
    document.addEventListener('keydown', checkInput);
}

function startGame() {
    if (isGameRunning || isCountingDown) {
        return;
    }

    initAudio();

    isCountingDown = true;
    setDifficultyButtonsDisabled(true);

    score = 0;
    timeLeft = DIFFICULTY_SETTINGS[difficulty].startTime;
    comboCount = 0;

    messageElement.innerText = '';
    clearRankBadge();
    clearCharVisuals();
    updateDisplay();

    runCountdown(beginRound);
}

// ========================================
// 게임 리셋
// ========================================

function resetGame() {
    clearInterval(gameInterval);
    clearTimeout(countdownTimeoutId);

    score = 0;
    timeLeft = DIFFICULTY_SETTINGS[difficulty].startTime;
    comboCount = 0;

    messageElement.innerText = '';
    clearRankBadge();
    updateDisplay();

    targetCharElement.innerText = '';
    targetCharElement.className = '';
    clearCharVisuals();

    document.removeEventListener('keydown', checkInput);
    isGameRunning = false;
    isCountingDown = false;
    setDifficultyButtonsDisabled(false);
}

// ========================================
// 페이지 로드 시 초기 설정
// ========================================

function initGame() {
    bestScore = loadBestScore();
    updateBestScoreDisplay();

    try {
        const storedSound = localStorage.getItem(SOUND_ENABLED_KEY);
        soundEnabled = storedSound === null ? true : storedSound === '1';
    } catch (error) {
        soundEnabled = true;
    }
    updateSoundButton();

    difficultyButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
    });

    timeLeft = DIFFICULTY_SETTINGS[difficulty].startTime;
    updateDisplay();

    targetCharElement.innerText = '';
    targetCharElement.className = '';
    clearCharVisuals();
    clearRankBadge();

    renderHistory(loadHistory());
}

initGame();
