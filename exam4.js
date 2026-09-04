// ========================================
// 게임 상수
// ========================================

const CORRECT_SCORE = 10;
const WRONG_SCORE_PENALTY = 5;

const WRONG_TIME_PENALTY = 5;   // 오답 시 시간 감소
const COMBO_TARGET = 3;         // 이만큼 연속 정답을 맞히면 콤보 보너스 발동
const COMBO_TIME_BONUS = 6;     // 콤보 보너스로 늘어나는 시간
const EFFECT_ALWAYS_ON_SCORE = 50; // 이 점수를 넘으면 매번 시각 효과가 등장 (난이도 상승)

const CHAR_EFFECTS = ['', 'effect-spin', 'effect-scale', 'effect-faint'];

const HISTORY_KEY = 'typingQuestHistory';
const HISTORY_LIMIT = 5;

// ========================================
// 게임 상태를 관리하는 변수
// ========================================

let score = 0;
let timeLeft = 20;
let comboCount = 0;

let gameInterval;
let isGameRunning = false;

// ========================================
// DOM 요소 참조
// ========================================

const targetCharElement = document.getElementById('targetChar');
const charTypeElement = document.getElementById('charType');
const stageElement = document.getElementById('stage');
const popupElement = document.getElementById('popup');

const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const comboElement = document.getElementById('combo');
const comboPanelElement = document.getElementById('comboPanel');

const messageElement = document.getElementById('message');
const historyListElement = document.getElementById('historyList');

// ========================================
// 랜덤 문자 생성
// ========================================

function getRandomChar() {
    // 대문자 + 소문자 + 숫자
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
}

// 문자가 숫자인지, 대문자인지, 소문자인지 구분
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

// 회전 / 크기 변화 / 희미한 깜빡임 중 하나를 랜덤으로 입힌다
// 점수가 EFFECT_ALWAYS_ON_SCORE를 넘으면 "효과 없음"을 제외해 난이도를 올린다
function applyRandomEffect() {
    targetCharElement.classList.remove('effect-spin', 'effect-scale', 'effect-faint');

    const pool = score >= EFFECT_ALWAYS_ON_SCORE
        ? CHAR_EFFECTS.filter(effect => effect !== '')
        : CHAR_EFFECTS;

    const effect = pool[Math.floor(Math.random() * pool.length)];
    if (effect) {
        targetCharElement.classList.add(effect);
    }
}

// 타겟 문자에 남아있는 색깔 / 효과 클래스를 모두 지운다
function clearCharVisuals() {
    targetCharElement.classList.remove(
        'type-upper', 'type-lower', 'type-number',
        'effect-spin', 'effect-scale', 'effect-faint'
    );
    charTypeElement.textContent = '';
    popupElement.classList.remove('show');
}

// ========================================
// 새로운 타겟 문자 설정
// ========================================

function setNewTargetChar() {
    const newChar = getRandomChar();
    targetCharElement.innerText = newChar;

    applyCharType(newChar);
    applyRandomEffect();
}

// ========================================
// 정답 / 오답 시 스테이지 테두리 효과
// ========================================

function flashStage(isCorrect) {
    const flashClass = isCorrect ? 'flash-correct' : 'flash-wrong';
    stageElement.classList.add(flashClass);
    setTimeout(() => stageElement.classList.remove(flashClass), 150);
}

// 콤보 보너스 / 콤보 브레이크를 알려주는 팝업 텍스트
function showPopup(text, color) {
    popupElement.textContent = text;
    popupElement.style.color = color;

    // 애니메이션을 처음부터 다시 재생하기 위해 클래스를 껐다 켠다
    popupElement.classList.remove('show');
    void popupElement.offsetWidth;
    popupElement.classList.add('show');
}

// 콤보 패널이 살짝 튀는 느낌을 주는 효과
function pulseCombo() {
    comboPanelElement.classList.remove('combo-pulse');
    void comboPanelElement.offsetWidth;
    comboPanelElement.classList.add('combo-pulse');
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
    // Shift, Enter, CapsLock 등 한 글자가 아닌 키는 무시한다
    if (event.key.length !== 1) {
        return;
    }

    // 대소문자를 구분해서 정확히 일치할 때만 정답으로 처리한다
    const isCorrect = event.key === targetCharElement.innerText;

    if (isCorrect) {
        score += CORRECT_SCORE;
        comboCount++;
        pulseCombo();

        // 3번 연속으로 맞혔을 때만 시간이 늘어난다
        if (comboCount >= COMBO_TARGET) {
            timeLeft += COMBO_TIME_BONUS;
            showPopup(`+${COMBO_TIME_BONUS} SEC!`, '#00ff41');
            comboCount = 0;
        }
    } else {
        score = Math.max(0, score - WRONG_SCORE_PENALTY);
        timeLeft -= WRONG_TIME_PENALTY;

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

    targetCharElement.innerText = '';
    clearCharVisuals();

    timeLeft = 0;
    comboCount = 0;
    updateDisplay();

    messageElement.innerText = `시간 초과! 최종 점수: ${score}`;
    addScoreToHistory(score);

    document.removeEventListener('keydown', checkInput);
    isGameRunning = false;
}

// ========================================
// 게임 시작
// ========================================

function startGame() {
    if (isGameRunning) {
        return;
    }
    isGameRunning = true;

    score = 0;
    timeLeft = 20;
    comboCount = 0;

    messageElement.innerText = '';
    updateDisplay();
    setNewTargetChar();

    gameInterval = setInterval(updateTimer, 1000);
    document.addEventListener('keydown', checkInput);
}

// ========================================
// 게임 리셋
// ========================================

function resetGame() {
    clearInterval(gameInterval);

    score = 0;
    timeLeft = 20;
    comboCount = 0;

    messageElement.innerText = '';
    updateDisplay();

    targetCharElement.innerText = '';
    clearCharVisuals();

    document.removeEventListener('keydown', checkInput);
    isGameRunning = false;
}

// ========================================
// 페이지 로드 시 초기 설정
// ========================================

function initGame() {
    updateDisplay();

    targetCharElement.innerText = '';
    clearCharVisuals();

    renderHistory(loadHistory());
}

initGame();
