import { parseISO } from 'date-fns';

export const convertEventsToDateEvents = ( events = []) => {

    return events.map( event => {
        // event의 모든 속성을 복사하여 새 객체를 만들고,
        // start와 end 속성만 새로 덮어씁니다.
        return {
            ...event,
            start: parseISO( event.start ),
            end: parseISO( event.end ),
        };
    })

}
