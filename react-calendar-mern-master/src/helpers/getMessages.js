export const getMessagesES = () => {
    return {
        allDay: '종일',
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
        noEventsInRange: '이 범위에 이벤트가 없습니다',
        showMore: total => `+ 더 보기 (${total})`
    };
}