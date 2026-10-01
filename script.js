document.addEventListener('DOMContentLoaded', () => {
  // DOM 요소 참조
  const logoLink = document.getElementById('logo-link');
  const inputSection = document.getElementById('input-section');
  const qrSection = document.getElementById('qr-section');
  const qrForm = document.getElementById('qr-form');
  const urlInput = document.getElementById('url-input');
  const submitBtn = document.getElementById('submit-btn');
  const inputGroup = document.querySelector('.input-group');
  const inputErrorMsg = document.getElementById('input-error-msg');
  const qrCanvasContainer = document.getElementById('qr-canvas-container');
  const qrClickableArea = document.getElementById('qr-clickable-area');
  const qrTargetUrl = document.getElementById('qr-target-url');
  const downloadJpgBtn = document.getElementById('download-jpg-btn');
  const copyUrlBtn = document.getElementById('copy-url-btn');
  const toast = document.getElementById('toast');

  let currentUrl = '';
  let toastTimer = null;

  // 토스트 메시지 함수
  function showToast(message) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  // 오류 메시지 표시 함수
  function showError(msg) {
    inputErrorMsg.textContent = msg;
    inputErrorMsg.classList.add('visible');
    inputGroup.classList.add('shake');
    setTimeout(() => {
      inputGroup.classList.remove('shake');
    }, 500);
  }

  // 오류 메시지 초기화
  function clearError() {
    inputErrorMsg.textContent = '';
    inputErrorMsg.classList.remove('visible');
  }

  // URL 형식 보완 및 검증
  function normalizeUrl(input) {
    let trimmed = input.trim();
    if (!trimmed) return '';

    // 프로토콜이 없는 경우 (예: naver.com, sdu.ac.kr) 자동으로 https:// 추가
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = 'https://' + trimmed;
    }
    return trimmed;
  }

  // QR코드 생성 및 화면 전환
  function generateQRCode() {
    clearError();
    const rawVal = urlInput.value;
    if (!rawVal.trim()) {
      showError('QR코드로 변환할 URL을 입력해주세요.');
      urlInput.focus();
      return;
    }

    const finalUrl = normalizeUrl(rawVal);
    currentUrl = finalUrl;

    // QR코드 컨테이너 초기화
    qrCanvasContainer.innerHTML = '';

    try {
      if (typeof QRCode === 'undefined') {
        showError('QR 코드 라이브러리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      // QRCode 인스턴스 생성
      new QRCode(qrCanvasContainer, {
        text: finalUrl,
        width: 220,
        height: 220,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
      });

      // 중복 생성(canvas + img)으로 인한 박스 초과 방지: canvas를 남기고 img는 확실히 제어
      setTimeout(() => {
        const canvas = qrCanvasContainer.querySelector('canvas');
        const img = qrCanvasContainer.querySelector('img');
        if (canvas) {
          canvas.style.display = 'block';
          canvas.style.width = '220px';
          canvas.style.height = '220px';
          if (img) img.style.display = 'none';
        } else if (img) {
          img.style.display = 'block';
          img.style.width = '220px';
          img.style.height = '220px';
        }
      }, 20);

      // URL 표시 업데이트
      qrTargetUrl.textContent = finalUrl;

      // 애니메이션: 입력창은 하단으로 이동, QR코드는 중앙에 페이드인
      inputSection.classList.remove('state-center');
      inputSection.classList.add('state-bottom');

      qrSection.classList.remove('hidden');

      showToast('QR 코드가 성공적으로 생성되었습니다!');
    } catch (err) {
      console.error('QR 생성 오류:', err);
      showError('QR 코드 생성 중 오류가 발생했습니다.');
    }
  }

  // QR코드를 고화질 JPG 이미지로 다운로드
  function downloadQRAsJPG() {
    if (!currentUrl) {
      showToast('먼저 QR 코드를 생성해주세요.');
      return;
    }

    const canvas = qrCanvasContainer.querySelector('canvas');
    const img = qrCanvasContainer.querySelector('img');

    if (!canvas && (!img || !img.src)) {
      showToast('다운로드할 QR 코드를 찾을 수 없습니다.');
      return;
    }

    // 다운로드용 고해상도 캔버스 생성
    const exportCanvas = document.createElement('canvas');
    const size = 320;      // 캔버스 전체 크기
    const padding = 28;    // 테두리 여백
    const qrSize = size - (padding * 2);
    exportCanvas.width = size;
    exportCanvas.height = size;
    const ctx = exportCanvas.getContext('2d');

    // 중요: JPG는 투명 채널을 지원하지 않으므로 배경을 순백색(#ffffff)으로 채움
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 실제 다운로드 실행 헬퍼
    const triggerDownload = (drawableSource) => {
      try {
        ctx.drawImage(drawableSource, padding, padding, qrSize, qrSize);

        // JPG 품질 95%로 변환
        const jpgDataUrl = exportCanvas.toDataURL('image/jpeg', 0.95);

        // 파일명 생성: qr_YYYYMMDD_HHMMSS.jpg
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        const filename = `qrcode_${yyyy}${mm}${dd}_${hh}${min}${ss}.jpg`;

        // 다운로드 트리거
        const link = document.createElement('a');
        link.download = filename;
        link.href = jpgDataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast(`JPG 파일로 다운로드되었습니다 (${filename})`);
      } catch (e) {
        console.error('다운로드 변환 오류:', e);
        showToast('JPG 다운로드 중 오류가 발생했습니다.');
      }
    };

    if (canvas && canvas.width > 0) {
      triggerDownload(canvas);
    } else if (img && img.src) {
      if (img.complete) {
        triggerDownload(img);
      } else {
        img.onload = () => triggerDownload(img);
      }
    }
  }

  // 초기 화면으로 리셋
  function resetToInitial() {
    inputSection.classList.remove('state-bottom');
    inputSection.classList.add('state-center');
    qrSection.classList.add('hidden');
    qrCanvasContainer.innerHTML = '';
    urlInput.value = '';
    currentUrl = '';
    clearError();
    urlInput.focus();
  }

  // 폼 제출 이벤트 (확인 버튼 또는 Enter)
  qrForm.addEventListener('submit', (e) => {
    e.preventDefault();
    generateQRCode();
  });

  // 입력 중 에러 초기화
  urlInput.addEventListener('input', () => {
    if (inputErrorMsg.classList.contains('visible')) {
      clearError();
    }
  });

  // 1. QR코드 클릭 시 JPG 다운로드 (요구사항 4)
  qrClickableArea.addEventListener('click', () => {
    downloadQRAsJPG();
  });

  // 키보드 접근성 지원 (Enter, Space로 다운로드 가능)
  qrClickableArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      downloadQRAsJPG();
    }
  });

  // 추가 다운로드 버튼 클릭
  downloadJpgBtn.addEventListener('click', () => {
    downloadQRAsJPG();
  });

  // URL 복사 버튼
  copyUrlBtn.addEventListener('click', () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl)
      .then(() => showToast('URL이 클립보드에 복사되었습니다.'))
      .catch(() => showToast('URL 복사에 실패했습니다.'));
  });

  // URL 텍스트 클릭 시에도 복사 지원
  qrTargetUrl.addEventListener('click', () => {
    if (!currentUrl) return;
    navigator.clipboard.writeText(currentUrl)
      .then(() => showToast('URL이 클립보드에 복사되었습니다.'))
      .catch(() => showToast('URL 복사에 실패했습니다.'));
  });

  // 로고 클릭 시 초기 화면으로 복귀
  logoLink.addEventListener('click', (e) => {
    e.preventDefault();
    resetToInitial();
  });

  // 페이지 로드 시 인풋 자동 포커스
  setTimeout(() => {
    urlInput.focus();
  }, 100);

  // ==========================================================================
  // 마우스 커서 위치 기반 실시간 인터랙티브 그라데이션
  // ==========================================================================
  let targetX = 0.5;
  let targetY = 0.5;
  let currentX = 0.5;
  let currentY = 0.5;
  let idleTime = 0;

  window.addEventListener('mousemove', (e) => {
    targetX = e.clientX / window.innerWidth;
    targetY = e.clientY / window.innerHeight;
    idleTime = 0;
  });

  // 모바일 / 터치 디바이스 지원
  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      targetX = e.touches[0].clientX / window.innerWidth;
      targetY = e.touches[0].clientY / window.innerHeight;
      idleTime = 0;
    }
  }, { passive: true });

  function updateInteractiveGradient() {
    idleTime += 0.015;

    // 마우스가 멈춰있을 때도 은은하게 숨쉬듯 오로라 파동 유지
    const idleOffsetX = Math.sin(idleTime * 0.8) * 0.04;
    const idleOffsetY = Math.cos(idleTime * 0.7) * 0.04;

    const effectiveTargetX = Math.max(0, Math.min(1, targetX + idleOffsetX));
    const effectiveTargetY = Math.max(0, Math.min(1, targetY + idleOffsetY));

    // 부드러운 감쇠 (Lerp 보간)
    currentX += (effectiveTargetX - currentX) * 0.07;
    currentY += (effectiveTargetY - currentY) * 0.07;

    // 로고 시그니처 4색: Cyan(~185), Purple/Violet(~280), Amber/Gold(~40)
    // 마우스 커서의 X, Y 좌표에 따라 유기적으로 색조(Hue) 시프트
    const hue1 = 175 + (currentX - 0.5) * 50;  // 150(민트 시안) ~ 200(스카이 블루)
    const hue2 = 280 + (currentY - 0.5) * 60;  // 250(바이올렛) ~ 310(마젠타 핑크)
    const hue3 = 40 + ((currentX + currentY) * 0.5 - 0.5) * 35; // 22(피치 코랄) ~ 58(골드 앰버)

    const posX = (currentX * 100).toFixed(2);
    const posY = (currentY * 100).toFixed(2);

    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--mouse-x', `${posX}%`);
    rootStyle.setProperty('--mouse-y', `${posY}%`);
    rootStyle.setProperty('--glow-1', `hsla(${hue1.toFixed(1)}, 98%, 68%, 0.35)`);
    rootStyle.setProperty('--glow-2', `hsla(${hue2.toFixed(1)}, 92%, 70%, 0.28)`);
    rootStyle.setProperty('--glow-3', `hsla(${hue3.toFixed(1)}, 100%, 68%, 0.22)`);

    requestAnimationFrame(updateInteractiveGradient);
  }

  requestAnimationFrame(updateInteractiveGradient);
});