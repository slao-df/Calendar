// src/hooks/useAssistant.js

/**
 * AI 도우미에게 자연어 명령을 보내서
 * 일정 자동 생성 API(/assistant)를 호출하는 헬퍼
 *
 * 반환 형식:
 *   { ok: true,  ...서버에서 내려준 데이터 }
 *   { ok: false, message: '에러 메시지' }
 */
export async function askAssistant(prompt, options = {}) {
  const API_URL = import.meta.env.VITE_API_URL;   // 예: "http://localhost:4000/api"
  const token   = localStorage.getItem('token') || '';

  // 혹시라도 VITE_API_URL이 비어 있으면 바로 실패 처리
  if (!API_URL) {
    console.error('[assistant] VITE_API_URL 이 설정되지 않았습니다.');
    return { ok: false, message: 'API 서버 주소가 설정되지 않았습니다.' };
  }

  try {
    // 서버에 보낼 payload 구성
    const payload = {
      text: prompt,   // 서버에서 req.body.text 로 받음
      // 필요하다면 명시적으로 넘길 추가 옵션들
      ...(options.calendarId       ? { calendarId: options.calendarId }             : {}),
      ...(options.calendarSummary  ? { calendarSummary: options.calendarSummary }   : {}),
      ...(options.year             ? { year: options.year }                         : {}),
      ...(options.month            ? { month: options.month }                       : {}),
      ...(options.weekday          ? { weekday: options.weekday }                   : {}),
    };

    // 실제 요청
    const resp = await fetch(`${API_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-token': token,
      },
      body: JSON.stringify(payload),
    });

    // 1) HTTP 레벨 에러 (404, 500 등)
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('[assistant] http error', resp.status, errText);
      return {
        ok: false,
        message: `HTTP ${resp.status}: ${errText || '요청 처리 중 오류가 발생했습니다.'}`,
      };
    }

    // 2) JSON 파싱 에러 구분
    let data;
    try {
      data = await resp.json();
    } catch (e) {
      const raw = await resp.text().catch(() => '');
      console.error('[assistant] json parse error, raw =', raw);
      return { ok: false, message: '서버 응답 형식이 올바르지 않습니다.' };
    }

    // 3) 서버가 내려준 형식에 맞춰 ok 여부 판단
    if (data && typeof data.ok === 'boolean') {
      return data;   // 예: { ok:true, inserted:4, ... }
    }

    // ok 필드가 없는 경우도 방어
    return { ok: true, ...data };

  } catch (err) {
    // 진짜 네트워크 단에서의 오류일 때만 여기로 옴
    console.error('[assistant] fetch error', err);
    return { ok: false, message: '서버 연결에 실패했어요.' };
  }
}
