document.addEventListener('DOMContentLoaded', () => {
  // 탭 관리
  let currentTab = 'url';
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = {
    url: document.getElementById('panel-url'),
    wifi: document.getElementById('panel-wifi'),
    bank: document.getElementById('panel-bank')
  };

  // URL 탭 요소
  const urlInput = document.getElementById('url-input');
  const clearBtn = document.getElementById('clear-btn');

  // 와이파이 탭 요소
  const wifiSsid = document.getElementById('wifi-ssid');
  const wifiType = document.getElementById('wifi-type');
  const wifiPass = document.getElementById('wifi-pass');
  const wifiPassGroup = document.getElementById('wifi-pass-group');
  const wifiHidden = document.getElementById('wifi-hidden');

  // 계좌번호 탭 요소
  const bankSelect = document.getElementById('bank-select');
  const customBankGroup = document.getElementById('custom-bank-group');
  const customBankName = document.getElementById('custom-bank-name');
  const bankAccount = document.getElementById('bank-account');
  const bankHolder = document.getElementById('bank-holder');
  const bankAmount = document.getElementById('bank-amount');

  // 공통 옵션 요소
  const generateBtn = document.getElementById('generate-btn');
  const qrSizeSelect = document.getElementById('qr-size');
  const colorDarkInput = document.getElementById('color-dark');
  const colorLightInput = document.getElementById('color-light');
  const darkColorCode = document.getElementById('dark-color-code');
  const lightColorCode = document.getElementById('light-color-code');

  // 결과 뷰 요소
  const qrWrapper = document.getElementById('qr-wrapper');
  const qrContainer = document.getElementById('qr-container');
  const qrPlaceholder = document.getElementById('qr-placeholder');
  const qrInfoSummary = document.getElementById('qr-info-summary');
  const actionButtons = document.getElementById('action-buttons');
  const downloadBtn = document.getElementById('download-btn');
  const copyBtn = document.getElementById('copy-btn');
  const toast = document.getElementById('toast');

  let currentQrData = null; // { text: string, filenamePrefix: string, summary: string }

  // 탭 전환 처리
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetType = btn.getAttribute('data-type');
      if (currentTab === targetType) return;

      tabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      Object.keys(tabPanels).forEach(key => {
        tabPanels[key].classList.toggle('active', key === targetType);
      });

      currentTab = targetType;
    });
  });

  // 와이파이 보안 방식 변경 시 비밀번호 필드 토글
  wifiType.addEventListener('change', () => {
    if (wifiType.value === 'nopass') {
      wifiPassGroup.style.display = 'none';
    } else {
      wifiPassGroup.style.display = 'flex';
    }
  });

  // 은행 선택 변경 시 기타 직접입력 필드 토글
  bankSelect.addEventListener('change', () => {
    if (bankSelect.value === '기타') {
      customBankGroup.style.display = 'flex';
    } else {
      customBankGroup.style.display = 'none';
    }
  });

  // URL 입력 시 클리어 버튼 표시/숨김
  urlInput.addEventListener('input', () => {
    clearBtn.style.display = urlInput.value ? 'flex' : 'none';
  });

  clearBtn.addEventListener('click', () => {
    urlInput.value = '';
    clearBtn.style.display = 'none';
    urlInput.focus();
    resetPreview();
  });

  // 색상 피커 동기화 및 실시간 업데이트
  colorDarkInput.addEventListener('input', (e) => {
    darkColorCode.textContent = e.target.value.toUpperCase();
    if (currentQrData) renderCurrentQR();
  });

  colorLightInput.addEventListener('input', (e) => {
    lightColorCode.textContent = e.target.value.toUpperCase();
    if (currentQrData) renderCurrentQR();
  });

  qrSizeSelect.addEventListener('change', () => {
    if (currentQrData) renderCurrentQR();
  });

  // 엔터 키 처리
  [urlInput, wifiSsid, wifiPass, bankAccount, bankHolder, bankAmount].forEach(input => {
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') generateQRCode();
      });
    }
  });

  generateBtn.addEventListener('click', generateQRCode);

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  function resetPreview() {
    qrContainer.innerHTML = '';
    qrContainer.style.display = 'none';
    qrPlaceholder.style.display = 'flex';
    qrInfoSummary.style.display = 'none';
    actionButtons.style.display = 'none';
    qrWrapper.classList.remove('has-qr');
    currentQrData = null;
  }

  // 특수문자 이스케이프 (Wi-Fi 스펙: \, ;, ,, :, ")
  function escapeWifi(str) {
    return str.replace(/([\\;,":])/g, '\\$1');
  }

  // 파일명 안전 변환
  function sanitizeForFilename(str) {
    return str
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/[\\/:*?"<>|#%&={}\s]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 45);
  }

  // 데이터 추출 및 포맷팅
  function buildPayload() {
    if (currentTab === 'url') {
      const raw = urlInput.value.trim();
      if (!raw) {
        showToast('⚠️ URL 또는 텍스트를 입력해주세요.');
        urlInput.focus();
        return null;
      }
      let finalUrl = raw;
      if (!/^[a-zA-Z]+:\/\//.test(finalUrl) && /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(finalUrl)) {
        finalUrl = 'https://' + finalUrl;
      }
      return {
        text: finalUrl,
        filename: sanitizeForFilename(raw) || 'url',
        summary: `🌐 링크: ${finalUrl}`
      };
    }

    if (currentTab === 'wifi') {
      const ssid = wifiSsid.value.trim();
      if (!ssid) {
        showToast('⚠️ 와이파이 이름(SSID)을 입력해주세요.');
        wifiSsid.focus();
        return null;
      }
      const type = wifiType.value;
      const pass = wifiPass.value;
      const isHidden = wifiHidden.checked;

      if (type !== 'nopass' && !pass) {
        showToast('⚠️ 와이파이 비밀번호를 입력해주세요.');
        wifiPass.focus();
        return null;
      }

      // Wi-Fi QR 표준 포맷: WIFI:T:WPA;S:MySSID;P:mypass;H:false;;
      let wifiString = `WIFI:T:${type};S:${escapeWifi(ssid)};`;
      if (type !== 'nopass') {
        wifiString += `P:${escapeWifi(pass)};`;
      }
      if (isHidden) {
        wifiString += `H:true;`;
      }
      wifiString += ';';

      return {
        text: wifiString,
        filename: `wifi_${sanitizeForFilename(ssid)}`,
        summary: `📶 Wi-Fi: ${ssid} (${type === 'nopass' ? '개방형' : '보안연결'})`
      };
    }

    if (currentTab === 'bank') {
      let bankName = bankSelect.value;
      if (bankName === '기타') {
        bankName = customBankName.value.trim() || '은행';
      }
      const account = bankAccount.value.trim();
      if (!account) {
        showToast('⚠️ 계좌번호를 입력해주세요.');
        bankAccount.focus();
        return null;
      }
      const holder = bankHolder.value.trim();
      const amount = bankAmount.value.trim();

      // 계좌번호 텍스트 조합 (스캔 시 직관적으로 복사 및 확인 가능한 포맷)
      let payloadLines = [`[계좌 정보]`];
      payloadLines.push(`은행: ${bankName}`);
      payloadLines.push(`계좌번호: ${account}`);
      if (holder) payloadLines.push(`예금주: ${holder}`);
      if (amount && Number(amount) > 0) {
        payloadLines.push(`송금요청액: ${Number(amount).toLocaleString()}원`);
      }
      const bankPayload = payloadLines.join('\n');

      let namePart = `${bankName}_${account.replace(/[^0-9]/g, '')}`;
      if (holder) namePart += `_${holder}`;

      return {
        text: bankPayload,
        filename: `bank_${sanitizeForFilename(namePart)}`,
        summary: `💳 ${bankName} ${account}${holder ? ` (${holder})` : ''}${amount ? ` - ${Number(amount).toLocaleString()}원` : ''}`
      };
    }

    return null;
  }

  function renderCurrentQR() {
    if (!currentQrData) return;

    const size = parseInt(qrSizeSelect.value, 10) || 260;
    const colorDark = colorDarkInput.value || '#000000';
    const colorLight = colorLightInput.value || '#ffffff';

    qrContainer.innerHTML = '';
    qrContainer.style.display = 'block';
    qrContainer.style.backgroundColor = colorLight;
    qrPlaceholder.style.display = 'none';
    qrWrapper.classList.add('has-qr');

    try {
      new QRCode(qrContainer, {
        text: currentQrData.text,
        width: size,
        height: size,
        colorDark: colorDark,
        colorLight: colorLight,
        correctLevel: QRCode.CorrectLevel.H
      });

      qrInfoSummary.textContent = currentQrData.summary;
      qrInfoSummary.style.display = 'block';
      actionButtons.style.display = 'flex';
    } catch (err) {
      console.error('QR 생성 오류:', err);
      showToast('❌ QR 코드 생성 중 오류가 발생했습니다.');
    }
  }

  function generateQRCode() {
    const payload = buildPayload();
    if (!payload) return;

    currentQrData = payload;
    renderCurrentQR();
    showToast('✨ QR 코드가 생성되었습니다!');
  }

  function getQrCanvas() {
    return qrContainer.querySelector('canvas');
  }

  // 다운로드 기능 (URL/와이파이명/계좌정보가 포함된 파일명)
  downloadBtn.addEventListener('click', () => {
    if (!currentQrData) return;
    const filename = `qrcode_${currentQrData.filename}.png`;

    const canvas = getQrCanvas();
    if (!canvas) {
      const img = qrContainer.querySelector('img');
      if (img && img.src) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = img.src;
        link.click();
        showToast(`🎉 ${filename} 저장 완료!`);
        return;
      }
      showToast('다운로드할 이미지가 없습니다.');
      return;
    }

    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`🎉 ${filename} 저장 완료!`);
  });

  // 클립보드 복사
  copyBtn.addEventListener('click', async () => {
    const canvas = getQrCanvas();
    if (!canvas || !currentQrData) {
      showToast('복사할 QR 코드가 없습니다.');
      return;
    }

    try {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          fallbackCopy();
          return;
        }

        if (navigator.clipboard && navigator.clipboard.write) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('📋 클립보드에 QR 이미지가 복사되었습니다!');
          } catch (e) {
            fallbackCopy();
          }
        } else {
          fallbackCopy();
        }
      });
    } catch (err) {
      fallbackCopy();
    }

    function fallbackCopy() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(currentQrData.text);
        showToast('ℹ️ 이미지 복사 권한 제한으로 텍스트 내용이 복사되었습니다.');
      } else {
        showToast('클립보드 복사를 지원하지 않는 환경입니다.');
      }
    }
  });
});
