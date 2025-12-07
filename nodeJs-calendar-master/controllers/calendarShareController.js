// controllers/calendarShareController.js

const Calendar = require('../models/Calendar');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/**
 * 공유 링크 생성/수정 (비밀번호 저장)
 * - 소유자만 실행 가능
 * - 링크 형식: FRONTEND_URL/share-calendar/:calendarId  (기존 방식 유지)
 */
const generateShareLink = async (req, res) => {
  const { id: calendarId } = req.params;
  const { password } = req.body || {};
  const userId = req.uid;

  try {
    const calendar = await Calendar.findById(calendarId);

    if (!calendar) {
      return res
        .status(404)
        .json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    // ✅ 소유자만 가능
    if (!calendar.isOwner(userId)) {
      return res
        .status(401)
        .json({ ok: false, msg: '해당 캘린더의 소유자만 공유 설정을 변경할 수 있습니다.' });
    }

    // 공유 링크가 없으면 생성 (기존 형식 유지)
    if (!calendar.shareLink) {
      calendar.shareLink = `${FRONTEND_URL}/share-calendar/${calendar.id}`;
    }

    // 비밀번호가 있으면 저장 (평문 저장 - 간단한 프로젝트용)
    if (typeof password === 'string' && password.trim() !== '') {
      calendar.sharePassword = password.trim();
    }

    await calendar.save();

    return res.json({
      ok: true,
      shareUrl: calendar.shareLink,
      sharePassword: calendar.sharePassword || '',
    });
  } catch (error) {
    console.error(`❌ 공유 링크 생성/수정 오류 (캘린더 ID: ${calendarId}):`, error);
    return res
      .status(500)
      .json({ ok: false, msg: '서버 오류 발생' });
  }
};

/**
 * 공유 캘린더 참여
 * - URL의 :shareId는 "원본 캘린더 ID" (기존 방식 유지)
 * - 비밀번호 일치 확인 후:
 *    1) 원본 캘린더 participants에 userId 추가
 *    2) 참여자 계정에 [공유] 캘린더 하나 생성 (originalCalendarId 연결)
 */
const joinSharedCalendar = async (req, res) => {
  const { shareId } = req.params;     // 원본 캘린더 ID
  const { password } = req.body;      // 사용자가 입력한 비밀번호
  const userId = req.uid;             // 참여자 (현재 로그인한 사용자)

  try {
    const originalCalendar = await Calendar.findById(shareId);

    if (!originalCalendar || !originalCalendar.shareLink) {
      return res
        .status(404)
        .json({ ok: false, msg: '공유 정보를 찾을 수 없습니다.' });
    }

    // 비밀번호 일치 확인
    if (originalCalendar.sharePassword !== password) {
      return res
        .status(401)
        .json({ ok: false, msg: '비밀번호가 일치하지 않습니다.' });
    }

    // 본인 캘린더에는 참여 불가
    if (originalCalendar.isOwner(userId)) {
      return res
        .status(400)
        .json({ ok: false, msg: '자신의 캘린더에는 참여할 수 없습니다.' });
    }

    // 이미 참여 중인지 확인
    const alreadyParticipant = (originalCalendar.participants || []).some(
      (pid) => String(pid) === String(userId)
    );

    if (alreadyParticipant) {
      // 이미 참여 중인 경우에도 프론트에서는 성공으로 간주해도 됨
      return res.status(200).json({
        ok: true,
        msg: '이미 참여 중인 캘린더입니다.',
      });
    }

    // 1) 원본 캘린더 participants에 추가
    originalCalendar.participants.push(userId);
    await originalCalendar.save();

    // 2) 참여자용 개인 캘린더 생성 ([공유] 프리픽스 + originalCalendarId 유지)
    const newCalendar = new Calendar({
      name: `[공유] ${originalCalendar.name}`,
      color: originalCalendar.color,
      memo: originalCalendar.memo,
      user: userId,                        // 소유자는 참여자
      originalCalendarId: originalCalendar._id,
    });

    await newCalendar.save();

    return res.json({
      ok: true,
      msg: '캘린더에 성공적으로 참여했습니다.',
      calendar: newCalendar,
    });
  } catch (error) {
    console.error('❌ 공유 캘린더 참여 오류:', error);
    return res
      .status(500)
      .json({ ok: false, msg: '공유 캘린더 참여에 실패했습니다.' });
  }
};

/**
 * 공유 정보 조회 (링크, 비밀번호)
 * - 소유자만 공유 정보 확인 가능 (기존 요구사항 그대로)
 */
const getShareInfo = async (req, res) => {
  const { id } = req.params; // 캘린더 ID
  const uid = req.uid;       // 현재 사용자

  try {
    const calendar = await Calendar.findById(id);
    if (!calendar) {
      return res
        .status(404)
        .json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }

    if (!calendar.isOwner(uid)) {
      return res
        .status(403)
        .json({ ok: false, msg: '공유 정보를 확인할 권한이 없습니다.' });
    }

    if (calendar.shareLink) {
      return res.json({
        ok: true,
        shareUrl: calendar.shareLink,
        sharePassword: calendar.sharePassword || '',
      });
    }

    // 공유가 아직 설정되지 않은 경우
    return res.json({
      ok: true,
      shareUrl: '',
      sharePassword: '',
    });
  } catch (error) {
    console.error(`❌ 공유 정보 조회 오류 (캘린더 ID: ${id}):`, error);
    return res
      .status(500)
      .json({ ok: false, msg: '서버 오류 발생' });
  }
};

/**
 * (선택) 재발급 API
 * - 현재 구조(shareLink = 전체 URL, sharePassword 평문)에서는
 *   generateShareLink로도 충분해서, 아직은 미구현 상태 유지
 */
const regenerateShareCredentials = async (req, res) => {
  return res
    .status(501)
    .json({ ok: false, msg: '구현되지 않은 기능입니다.' });
};

/**
 * (이전 버전 호환용) verifyAndAttachSharedCalendar
 * - 현재는 joinSharedCalendar로 기능이 대체되어 있으므로 미구현
 */
const verifyAndAttachSharedCalendar = async (req, res) => {
  return res
    .status(501)
    .json({ ok: false, msg: '구현되지 않은 기능입니다.' });
};

/**
 * 특정 참여자에게 편집 권한 부여
 * - 소유자만 실행 가능
 * - body: { participantId }
 */
const grantEditPermission = async (req, res) => {
  const { id: calendarId } = req.params;
  const { participantId } = req.body;
  const userId = req.uid;

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res
        .status(404)
        .json({ ok: false, msg: '캘린더 없음' });
    }

    // ✅ 소유자만 권한 부여 가능
    if (!calendar.isOwner(userId)) {
      return res
        .status(401)
        .json({ ok: false, msg: '소유자만 권한을 부여할 수 있습니다.' });
    }

    // 이미 편집자인지 확인
    const alreadyEditor = (calendar.editors || []).some(
      (eid) => String(eid) === String(participantId)
    );

    if (!alreadyEditor) {
      calendar.editors.push(participantId);
    }

    // 편집자는 기본적으로 viewer이기도 하므로 participants에 없으면 추가
    const alreadyParticipant = (calendar.participants || []).some(
      (pid) => String(pid) === String(participantId)
    );
    if (!alreadyParticipant) {
      calendar.participants.push(participantId);
    }

    await calendar.save();

    return res.json({
      ok: true,
      msg: '편집 권한이 부여되었습니다.',
      editors: calendar.editors,
      participants: calendar.participants,
    });
  } catch (error) {
    console.error('grantEditPermission 오류:', error);
    return res
      .status(500)
      .json({ ok: false, msg: '서버 오류' });
  }
};

/**
 * 캘린더 편집 권한 취소
 * - 소유자만 실행 가능
 * - body: { participantId }
 */
const revokeEditPermission = async (req, res) => {
  const { id: calendarId } = req.params;
  const { participantId } = req.body;
  const userId = req.uid;

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res
        .status(404)
        .json({ ok: false, msg: '캘린더 없음' });
    }

    // ✅ 소유자만 권한 취소 가능
    if (!calendar.isOwner(userId)) {
      return res
        .status(401)
        .json({ ok: false, msg: '소유자만 권한을 취소할 수 있습니다.' });
    }

    calendar.editors = (calendar.editors || []).filter(
      (eid) => String(eid) !== String(participantId)
    );

    await calendar.save();

    return res.json({
      ok: true,
      msg: '편집 권한이 취소되었습니다.',
      editors: calendar.editors,
    });
  } catch (error) {
    console.error('revokeEditPermission 오류:', error);
    return res
      .status(500)
      .json({ ok: false, msg: '서버 오류' });
  }
};

/**
 * 여러 참여자의 권한 일괄 변경
 * - body: { changes: { [userId]: true|false } }
 *   true  → editors에 추가
 *   false → editors에서 제거
 * - 소유자만 실행 가능
 */
const updateBulkPermissions = async (req, res) => {
  const { id: calendarId } = req.params;
  const { changes } = req.body || {};
  const userId = req.uid;

  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
    return res
      .status(400)
      .json({ ok: false, msg: '잘못된 요청입니다. 변경 사항이 없습니다.' });
  }

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) {
      return res
        .status(404)
        .json({ ok: false, msg: '캘린더 없음' });
    }

    if (!calendar.isOwner(userId)) {
      return res
        .status(401)
        .json({ ok: false, msg: '소유자만 권한 변경 가능' });
    }

    const grantIds = [];
    const revokeIds = [];

    for (const participantId in changes) {
      if (changes[participantId] === true) {
        grantIds.push(participantId);
      } else if (changes[participantId] === false) {
        revokeIds.push(participantId);
      }
    }

    // 실제 DB 업데이트
    const ops = [];

    if (grantIds.length > 0) {
      ops.push(
        Calendar.updateOne(
          { _id: calendarId },
          {
            $addToSet: {
              editors: { $each: grantIds },
              participants: { $each: grantIds }, // 편집자는 참여자이기도 함
            },
          }
        )
      );
    }

    if (revokeIds.length > 0) {
      ops.push(
        Calendar.updateOne(
          { _id: calendarId },
          { $pull: { editors: { $in: revokeIds } } }
        )
      );
    }

    if (ops.length > 0) {
      await Promise.all(ops);
    }

    // 최신값 다시 조회해서 반환
    const updated = await Calendar.findById(calendarId).lean();

    return res.json({
      ok: true,
      msg: '권한이 성공적으로 저장되었습니다.',
      editors: updated.editors || [],
      participants: updated.participants || [],
    });
  } catch (error) {
    console.error('일괄 권한 업데이트 오류:', error);
    return res
      .status(500)
      .json({ ok: false, msg: '서버 오류 발생' });
  }
};

module.exports = {
  generateShareLink,
  getShareInfo,
  joinSharedCalendar,
  regenerateShareCredentials,
  verifyAndAttachSharedCalendar,
  grantEditPermission,
  revokeEditPermission,
  updateBulkPermissions,
};
