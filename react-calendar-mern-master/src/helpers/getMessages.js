export const getMessagesKO = () => {
  return {
    allDay: '하루 종일',
    previous: '<',
    next: '>',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    agenda: '일정',
    date: '날짜',
    time: '시간',
    event: '이벤트',
    noEventsInRange: '이 기간에는 일정이 없습니다.',
    showMore: (total) => `+ 더 보기 (${total})`,
  };
};
