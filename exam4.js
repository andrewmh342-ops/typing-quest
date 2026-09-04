// ========================================
// 게임 상태를 관리하는 변수
// ========================================

let score = 0;
let timeLeft = 20;

let gameInterval;

let isGameRunning = false;


// ========================================
// DOM 요소 참조
// ========================================

const targetCharElement =
    document.getElementById('targetChar');

const stageElement =
    document.getElementById('stage');

const scoreElement =
    document.getElementById('score');

const timerElement =
    document.getElementById('timer');

const messageElement =
    document.getElementById('message');


// ========================================
// 랜덤 문자 생성
// ========================================

function getRandomChar() {

    /*
        대문자
        소문자
        숫자

        모두 포함
    */

    const chars =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    const randomIndex =
        Math.floor(Math.random() * chars.length);

    return chars[randomIndex];
}


// ========================================
// 새로운 타겟 문자 설정
// ========================================

function setNewTargetChar() {

    const newChar = getRandomChar();

    targetCharElement.innerText = newChar;

    /*
        새로운 문자가 나타날 때마다
        애니메이션을 다시 시작한다.

        기존 애니메이션을 잠깐 제거했다가
        다시 추가하는 방식이다.
    */

    targetCharElement.style.animation = 'none';

    /*
        브라우저가 변경사항을 인식하도록
        강제로 레이아웃을 한 번 계산한다.
    */

    void targetCharElement.offsetWidth;

    /*
        세 가지 애니메이션 다시 실행

        1. 좌우 이동
        2. 색깔 변경
        3. 깜빡임
    */

    targetCharElement.style.animation =
        'moveAlphabet 1.5s ease-in-out infinite, ' +
        'changeColor 3s linear infinite, ' +
        'blinkAlphabet 1.2s step-start infinite';
}


// ========================================
// 정답 / 오답 효과
// ========================================

function flashStage(isCorrect) {

    const flashClass =
        isCorrect
            ? 'flash-correct'
            : 'flash-wrong';

    stageElement.classList.add(flashClass);

    /*
        잠깐 효과를 보여준 후 제거
    */

    setTimeout(() => {

        stageElement.classList.remove(flashClass);

    }, 150);
}


// ========================================
// 점수 / 시간 화면 업데이트
// ========================================

function updateDisplay() {

    scoreElement.innerText =
        `점수: ${score}`;

    timerElement.innerText =
        `남은 시간: ${timeLeft}`;


    /*
        남은 시간이 5초 이하라면
        timer에 low-time 클래스를 추가한다.
    */

    timerElement.classList.toggle(
        'low-time',
        timeLeft <= 5
    );
}


// ========================================
// 키보드 입력 확인
// ========================================

function checkInput(event) {

    /*
        Shift, Enter, CapsLock 등의
        한 글자가 아닌 키는 무시한다.
    */

    if (event.key.length !== 1) {

        return;
    }


    /*
        대소문자를 구분한다.

        예:
        target = A
        입력 = A → 정답

        target = A
        입력 = a → 오답
    */

    const isCorrect =
        event.key === targetCharElement.innerText;


    // ====================================
    // 정답 처리
    // ====================================

    if (isCorrect) {

        score += 10;

        timeLeft += 2;

    }


    // ====================================
    // 오답 처리
    // ====================================

    else {

        /*
            점수가 0보다 작아지지 않도록 한다.
        */

        score =
            Math.max(0, score - 5);

        timeLeft -= 2;
    }


    // ====================================
    // 정답 / 오답 시각 효과
    // ====================================

    flashStage(isCorrect);


    // 화면 업데이트

    updateDisplay();


    // ====================================
    // 시간이 다 된 경우
    // ====================================

    if (timeLeft <= 0) {

        endGame();

        return;
    }


    // ====================================
    // 다음 문자 생성
    // ====================================

    setNewTargetChar();
}


// ========================================
// 타이머 업데이트
// ========================================

function updateTimer() {

    timeLeft--;

    updateDisplay();


    /*
        시간이 0초가 되면 게임 종료
    */

    if (timeLeft <= 0) {

        endGame();
    }
}


// ========================================
// 게임 종료
// ========================================

function endGame() {

    /*
        타이머 정지
    */

    clearInterval(gameInterval);


    /*
        타겟 문자 제거
    */

    targetCharElement.innerText = '';


    /*
        애니메이션도 정지
    */

    targetCharElement.style.animation = 'none';


    /*
        시간이 음수가 되지 않도록 처리
    */

    timeLeft = 0;


    // 화면 업데이트

    updateDisplay();


    // 최종 점수 표시

    messageElement.innerText =
        `시간 초과! 최종 점수: ${score}`;


    /*
        키보드 입력 이벤트 제거
    */

    document.removeEventListener(
        'keydown',
        checkInput
    );


    /*
        게임 실행 상태 종료
    */

    isGameRunning = false;
}


// ========================================
// 게임 시작
// ========================================

function startGame() {

    /*
        이미 게임이 실행 중이라면
        다시 시작하지 않는다.
    */

    if (isGameRunning) {

        return;
    }


    // 게임 실행 상태

    isGameRunning = true;


    // 게임 초기화

    score = 0;

    timeLeft = 20;


    // 이전 메시지 제거

    messageElement.innerText = '';


    // 화면 업데이트

    updateDisplay();


    /*
        첫 번째 타겟 문자 생성
    */

    setNewTargetChar();


    /*
        1초마다 타이머 실행
    */

    gameInterval =
        setInterval(
            updateTimer,
            1000
        );


    /*
        키보드 입력 이벤트 등록
    */

    document.addEventListener(
        'keydown',
        checkInput
    );
}


// ========================================
// 게임 리셋
// ========================================

function resetGame() {

    /*
        타이머 정지
    */

    clearInterval(gameInterval);


    // 게임 상태 초기화

    score = 0;

    timeLeft = 20;


    // 메시지 제거

    messageElement.innerText = '';


    // 화면 업데이트

    updateDisplay();


    /*
        타겟 문자 제거
    */

    targetCharElement.innerText = '';


    /*
        애니메이션 정지
    */

    targetCharElement.style.animation = 'none';


    /*
        키보드 이벤트 제거
    */

    document.removeEventListener(
        'keydown',
        checkInput
    );


    /*
        게임 실행 상태 종료
    */

    isGameRunning = false;
}


// ========================================
// 페이지 로드 시 초기 설정
// ========================================

function initGame() {

    updateDisplay();

    targetCharElement.innerText = '';

    /*
        게임 시작 전에는 애니메이션이
        실행되지 않도록 한다.
    */

    targetCharElement.style.animation = 'none';
}


// ========================================
// 게임 초기화
// ========================================

initGame();