// controllers/calendarShareController.js

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Calendar = require('../models/Calendar');
// const SharedCalendar = require('../models/SharedCalendar'); // 이 모델은 현재 로직에서 사용되지 않는 것 같습니다.
const { v4: uuidv4 } = require('uuid'); // uuid 임포트

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

/** 공유 링크 생성/수정 (비밀번호 저장) */
// controllers/calendarShareController.js

const generateShareLink = async (req, res) => {
  const { id: calendarId } = req.params;
  const { password } = req.body || {};
  const userId = req.uid;

  try {
    const calendar = await Calendar.findById(calendarId);

    if (!calendar) {
      return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    }
    if (calendar.user.toString() !== userId) {
      return res.status(401).json({ ok: false, msg: '권한이 없습니다.' });
    }

    // 공유 링크가 없으면 생성
    if (!calendar.shareLink) {
      calendar.shareLink = `${FRONTEND_URL}/share-calendar/${calendar.id}`;
    }

    // 비밀번호가 있으면 저장
    if (password !== undefined && password !== null && password.trim() !== '') {
      calendar.sharePassword = password;
    }

    await calendar.save();

    res.json({
      ok: true,
      shareUrl: calendar.shareLink,
      sharePassword: calendar.sharePassword || '',
    });
  } catch (error) {
    console.error(`❌ 공유 링크 생성/수정 오류 (캘린더 ID: ${calendarId}):`, error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' });
  }
};



/** 공유 캘린더 참여 (비밀번호 입력 → 내 계정에 추가) */
const joinSharedCalendar = async (req, res) => {
  const { shareId } = req.params; // URL에서 받은 원본 캘린더의 ID
  const { password } = req.body; // 사용자가 입력한 비밀번호
  const userId = req.uid; // 참여하려는 사용자 (현재 로그인된 사용자)

  try {
    // shareId로 원본 캘린더를 찾습니다.
    const originalCalendar = await Calendar.findById(shareId);

    // 유효성 검사
    if (!originalCalendar || !originalCalendar.shareLink) {
      return res.status(404).json({ ok: false, msg: '공유 정보를 찾을 수 없습니다.' });
    }
    if (originalCalendar.sharePassword !== password) {
      return res.status(401).json({ ok: false, msg: '비밀번호가 일치하지 않습니다.' });
    }
    if (originalCalendar.user.toString() === userId) {
      return res.status(400).json({ ok: false, msg: '자신의 캘린더에는 참여할 수 없습니다.' });
    }

    // 이미 참여 중인지 확인
    if (originalCalendar.participants.includes(userId)) {
        return res.status(200).json({
            ok: true,
            msg: '이미 참여 중인 캘린더입니다.',
        });
    }

    // 원본 캘린더에 participants 추가
    originalCalendar.participants.push(userId);
    await originalCalendar.save(); // 변경 사항을 DB에 저장

    // 참여자를 위한 새 캘린더 문서 생성
    const newCalendar = new Calendar({
      name: `[공유] ${originalCalendar.name}`, 
      color: originalCalendar.color,
      memo: originalCalendar.memo,
      user: userId, // 참여자 ID
      originalCalendarId: originalCalendar._id // 원본 ID
    });

    // 새 캘린더를 데이터베이스에 저장
    await newCalendar.save();

    // 성공 응답 전송
    return res.json({
      ok: true,
      msg: '캘린더에 성공적으로 참여했습니다.',
      // 저장된 새 캘린더 객체를 반환
      // (Mongoose가 .save() 후 반환된 객체에는 _id, createdAt, updatedAt이 포함)
      calendar: newCalendar 
    });
  } catch (error) {
    console.error('❌ 공유 캘린더 참여 오류:', error);
    res.status(500).json({ ok: false, msg: '공유 캘린더 참여에 실패했습니다.' });
  }
};

/**  공유 정보 조회 (링크, 비밀번호) */
const getShareInfo = async (req, res) => {
  const { id } = req.params; // 캘린더 ID
  const uid = req.uid; // 사용자 ID

  try {
    const calendar = await Calendar.findById(id);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더를 찾을 수 없습니다.' });
    if (calendar.user.toString() !== uid) return res.status(403).json({ ok: false, msg: '권한이 없습니다.' });

    // DB 조회 직후 로그 (디버깅용)
    // console.log('--- getShareInfo ---');
    // console.log('DB calendar:', JSON.stringify(calendar, null, 2));
    // console.log('calendar.shareLink:', calendar.shareLink);
    // console.log('calendar.sharePassword:', calendar.sharePassword);
    // console.log('--- /getShareInfo ---');

    // 모델 스키마에 정의된 shareLink 필드가 있는지 확인
    if (calendar.shareLink) {
      return res.json({
        ok: true,
        shareUrl: calendar.shareLink,
        sharePassword: calendar.sharePassword || "",
      });
    } else {
      // 정보가 없으면 빈 값 반환
      return res.json({
        ok: true,
        shareUrl: "",
        sharePassword: "",
      });
    }

  } catch (error) {
    console.error(`❌ 공유 정보 조회 오류 (캘린더 ID: ${id}):`, error);
    return res.status(500).json({ ok: false, msg: '서버 오류 발생' });
  }
};


// (선택) 재발급 API: 이 함수는 현재 shareLink/sharePassword 모델과 호환되지 않음
// 필요하다면 generateShareLink 함수와 유사하게 수정 필요
const regenerateShareCredentials = async (req, res) => {
   // TODO: 현재 모델 구조에 맞게 수정 필요 (shareLink, sharePassword 사용)
   return res.status(501).json({ ok: false, msg: '구현되지 않은 기능입니다.' });
};

// 공유 링크 접속 후(로그인 상태) 비밀번호 검증 + 내 목록에 추가
// 이 기능은 joinSharedCalendar 함수와 중복되므로 제거하거나 수정 필요
const verifyAndAttachSharedCalendar = async (req, res) => {
   // TODO: joinSharedCalendar 함수 사용 또는 현재 모델 구조에 맞게 수정 필요
   return res.status(501).json({ ok: false, msg: '구현되지 않은 기능입니다.' });
};

const grantEditPermission = async (req, res) => {
  const { id: calendarId } = req.params; // 원본 캘린더 ID
  const { participantId } = req.body; // 권한을 줄 유저 ID (예: user2)
  const userId = req.uid; // 요청자 (예: test)

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더 없음' });

    // 소유자만 권한을 줄 수 있음
    if (calendar.user.toString() !== userId) {
      return res.status(401).json({ ok: false, msg: '소유자만 권한을 부여할 수 있습니다.' });
    }

    // 이미 권한이 있는지 확인 후 추가
    if (!calendar.editors.includes(participantId)) {
      calendar.editors.push(participantId);
      await calendar.save();
    }
    res.json({ ok: true, msg: '편집 권한이 부여되었습니다.' });

  } catch (error) {
    res.status(500).json({ ok: false, msg: '서버 오류' });
  }
};

/** 캘린더 편집 권한 취소 */
const revokeEditPermission = async (req, res) => {
  const { id: calendarId } = req.params; // 원본 캘린더 ID
  const { participantId } = req.body; // 권한을 뺏을 유저 ID (예: user2)
  const userId = req.uid; // 요청자 (예: test)

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더 없음' });

    // 소유자만 권한을 취소할 수 있음
    if (calendar.user.toString() !== userId) {
      return res.status(401).json({ ok: false, msg: '소유자만 권한을 취소할 수 있습니다.' });
    }

    //권한 목록에서 제거
    calendar.editors = calendar.editors.filter(
      editorId => editorId.toString() !== participantId
    );
    await calendar.save();
    res.json({ ok: true, msg: '편집 권한이 취소되었습니다.' });

  } catch (error) {
    res.status(500).json({ ok: false, msg: '서버 오류' });
  }
};

const updateBulkPermissions = async (req, res) => {
  const { id: calendarId } = req.params;
  // changes 객체 예: { userId1: true, userId2: false } (true = 편집자 부여, false = 편집자 취소)
  const { changes } = req.body; 
  const userId = req.uid; // 요청자 (소유자여야 함)

  if (!changes || typeof changes !== 'object' || Object.keys(changes).length === 0) {
    return res.status(400).json({ ok: false, msg: '잘못된 요청입니다. 변경 사항이 없습니다.' });
  }

  try {
    const calendar = await Calendar.findById(calendarId);
    if (!calendar) return res.status(404).json({ ok: false, msg: '캘린더 없음' });

    // 소유자만 변경 가능
    if (calendar.user.toString() !== userId) {
      return res.status(401).json({ ok: false, msg: '소유자만 권한 변경 가능' });
    }

    // 변경사항 적용 준비
    const grantIds = []; // 편집 권한 부여할 ID 목록
    const revokeIds = []; // 편집 권한 취소할 ID 목록

    for (const participantId in changes) {
      if (changes[participantId] === true) {
        grantIds.push(participantId);
      } else if (changes[participantId] === false) {
        revokeIds.push(participantId);
      }
    }

    // DB 업데이트 (두 작업을 동시에 실행)
    await Promise.all([
      // 권한 부여 ($addToSet: 중복 없이 추가)
      grantIds.length > 0 ? Calendar.updateOne(
        { _id: calendarId },
        { $addToSet: { editors: { $each: grantIds } } }
      ) : Promise.resolve(), // 작업 없으면 통과
      
      // 권한 취소 ($pull: 배열에서 제거)
      revokeIds.length > 0 ? Calendar.updateOne(
        { _id: calendarId },
        { $pull: { editors: { $in: revokeIds } } }
      ) : Promise.resolve() // 작업 없으면 통과
    ]);
    
    res.json({ ok: true, msg: '권한이 성공적으로 저장되었습니다.' });

  } catch (error) {
    console.error('일괄 권한 업데이트 오류:', error);
    res.status(500).json({ ok: false, msg: '서버 오류 발생' });
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