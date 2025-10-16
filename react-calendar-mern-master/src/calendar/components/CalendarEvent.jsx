export const CalendarEvent = ({ event }) => {

    const { title, user, creatorName } = event;

    return (
        <>
            <strong>{ title }</strong>
            {/* 👇 [핵심] creatorName이 있으면 표시하고, 없으면 기존처럼 user.name을 표시합니다.
                   이렇게 하면 내가 만든 일정은 내 이름이, 공유받은 일정은 원본 작성자 이름이 나옵니다.
            */}
            <span> - { creatorName || user.name }</span>
        </>
    )
}
