// src/hooks/useAssistant.js

/**
 * AI 도우미에게 자연어 명령 또는 구조화 payload를 보내서
 * /assistant 엔드포인트를 호출하는 헬퍼
 *
 * 사용 예시:
 *   await askAssistant("11월 매주 화요일 13:00~14:00 '회사' 캘린더에 회의 추가해줘");
 *
 *   await askAssistant({
 *     text: "주간 회의 일정 만들어줘",
 *     year: 2025,
 *     month: 11,
 *     weekday: 2,
 *   });
 *
 * 반환 형식:
 *   { ok: true,  ...서버에서 내려준 데이터 }
 *   { ok: false, message: '에러 메시지' }
 */
export async function askAssistant(promptOrPayload, options = {}) {
  const API_URL = import.meta.env.VITE_API_URL; // 예: "http://localhost:4000/api"
  const token = localStorage.getItem('token') || '';

  if (!API_URL) {
    console.error('[assistant] VITE_API_URL 이 설정되지 않았습니다.');
    return { ok: false, message: 'API 서버 주소가 설정되지 않았습니다.' };
  }

  // payload 구성: 문자열 / 객체 둘 다 지원
  let payload;
  if (typeof promptOrPayload === 'string') {
    payload = {
      text: promptOrPayload,
      ...(options.calendarId ? { calendarId: options.calendarId } : {}),
      ...(options.calendarSummary ? { calendarSummary: options.calendarSummary } : {}),
      ...(options.year ? { year: options.year } : {}),
      ...(options.month ? { month: options.month } : {}),
      ...(options.weekday ? { weekday: options.weekday } : {}),
    };
  } else if (promptOrPayload && typeof promptOrPayload === 'object') {
    // 이미 { text, year, month, ... } 형태인 경우 그대로 보냄
    payload = { ...promptOrPayload };
  } else {
    payload = { text: String(promptOrPayload ?? '') };
  }

  try {
    const resp = await fetch(`${API_URL}/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-token': token,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      console.error('[assistant] http error', resp.status, errText);
      return {
        ok: false,
        message: `HTTP ${resp.status}: ${errText || '요청 처리 중 오류가 발생했습니다.'}`,
      };
    }

    let data;
    try {
      data = await resp.json();
    } catch (e) {
      const raw = await resp.text().catch(() => '');
      console.error('[assistant] json parse error, raw =', raw);
      return { ok: false, message: '서버 응답 형식이 올바르지 않습니다.' };
    }

    if (data && typeof data.ok === 'boolean') {
      return data; // 예: { ok:true, mode:'create'|'suggest-time', ... }
    }

    // ok 필드가 없으면 성공으로 간주
    return { ok: true, ...data };
  } catch (err) {
    console.error('[assistant] fetch error', err);
    return { ok: false, message: '서버 연결에 실패했어요.' };
  }
}
