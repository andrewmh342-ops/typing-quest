// 게임 상태를 관리하는 변수들
let score = 0;
let timeLeft = 20;
let gameInterval;
let isGameRunning = false; // 게임이 실행 중인지 확인하는 변수

// DOM 요소 참조
const targetCharElement = document.getElementById('targetChar');
const stageElement = document.getElementById('stage');
const scoreElement = document.getElementById('score');
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');

// 랜덤 문자를 생성하는 함수 (대문자/소문자/숫자를 모두 포함)
function getRandomChar() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return chars[Math.floor(Math.random() * chars.length)];
}

// 새로운 타겟 문자를 설정하는 함수
function setNewTargetChar() {
    targetCharElement.innerText = getRandomChar();
}

// 정답/오답 시 잠깐 테두리를 반짝여 주는 함수
function flashStage(isCorrect) {
    const flashClass = isCorrect ? 'flash-correct' : 'flash-wrong';
    stageElement.classList.add(flashClass);
    setTimeout(() => stageElement.classList.remove(flashClass), 150);
}

// 화면의 점수/시간 표시를 갱신하는 함수
function updateDisplay() {
    scoreElement.innerText = `점수: ${score}`;
    timerElement.innerText = `남은 시간: ${timeLeft}`;
    timerElement.classList.toggle('low-time', timeLeft <= 5);
}

// 입력된 문자를 확인하고 점수/시간을 업데이트하는 함수
function checkInput(event) {
    // 문자 키(한 글자)가 아닌 Shift, CapsLock, Enter 등의 키는 무시
    if (event.key.length !== 1) {
        return;
    }

    // 대소문자를 구분하여 정확히 일치하는 경우에만 정답으로 처리
    const isCorrect = event.key === targetCharElement.innerText;

    if (isCorrect) {
        score += 10;
        timeLeft += 2;
    } else {
        score = Math.max(0, score - 5); // 점수가 0 미만으로 내려가지 않도록 처리
        timeLeft -= 2;
    }

    flashStage(isCorrect);
    updateDisplay();

    if (timeLeft <= 0) {
        endGame();
        return;
    }

    setNewTargetChar();
}

// 타이머를 업데이트하고 시간이 다 되면 게임을 종료하는 함수
function updateTimer() {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
        endGame();
    }
}

// 게임을 종료하고 필요한 정리 작업을 수행하는 함수
function endGame() {
    clearInterval(gameInterval);
    targetCharElement.innerText = ''; // 타겟 문자 제거
    timeLeft = 0;
    updateDisplay();
    messageElement.innerText = `시간 초과! 최종 점수: ${score}`;
    document.removeEventListener('keydown', checkInput); // 키 입력 이벤트 제거
    isGameRunning = false; // 게임 실행 상태를 종료로 설정
}

// 게임을 초기화하고 시작하는 함수
function startGame() {
    if (isGameRunning) return; // 게임이 이미 실행 중이면 새로 시작하지 않음
    isGameRunning = true; // 게임 실행 상태를 시작으로 설정

    score = 0;
    timeLeft = 20;
    messageElement.innerText = '';
    updateDisplay();
    setNewTargetChar(); // 첫 번째 타겟 문자 설정

    gameInterval = setInterval(updateTimer, 1000); // 1초마다 타이머 업데이트
    document.addEventListener('keydown', checkInput); // 키 입력 이벤트 추가
}

// 게임을 리셋하는 함수
function resetGame() {
    clearInterval(gameInterval); // 타이머 정지
    score = 0;
    timeLeft = 20;
    messageElement.innerText = '';
    updateDisplay();
    targetCharElement.innerText = ''; // 타겟 문자 초기화
    document.removeEventListener('keydown', checkInput); // 키 입력 이벤트 제거
    isGameRunning = false; // 게임 실행 상태를 종료로 설정
}

// 페이지 로드 시 초기 설정
function initGame() {
    updateDisplay();
    targetCharElement.innerText = ''; // 게임 시작 전 타겟 문자 초기화
}

// 게임 초기화 함수 호출
initGame();
