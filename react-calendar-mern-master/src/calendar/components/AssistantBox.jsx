// src/components/AssistantBox.jsx
import { useState } from 'react';
import { askAssistant } from '../../hooks/useAssistant';

export default function AssistantBox() {
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState([
    { role: 'assistant', text: '무엇을 도와드릴까요? 예: "11월 매주 월요일 10시에 팀 회의 추가"' }
  ]);
  const [pending, setPending] = useState(false);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;
    setMsgs(m => [...m, { role: 'user', text }]);
    setInput('');
    setPending(true);
    try {
      const { reply } = await askAssistant(text);
      setMsgs(m => [...m, { role: 'assistant', text: reply || '(응답 없음)' }]);
    } catch (e) {
      setMsgs(m => [...m, { role: 'assistant', text: `오류: ${e.message}` }]);
    } finally {
      setPending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{border:'1px solid #ddd', borderRadius:8, padding:12, maxWidth:520}}>
      <div style={{maxHeight:240, overflowY:'auto', marginBottom:8}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{margin:'6px 0'}}>
            <strong style={{color: m.role==='assistant'?'#2563eb':'#111'}}>
              {m.role === 'assistant' ? 'AI' : '나'}:
            </strong>{' '}
            <span style={{whiteSpace:'pre-wrap'}}>{m.text}</span>
          </div>
        ))}
      </div>
      <textarea
        rows={2}
        value={input}
        onChange={e=>setInput(e.target.value)}
        onKeyDown={onKey}
        placeholder='예: "캘린더 Team에 내일 오후 3시 1시간 회의 추가"'
        style={{width:'100%', resize:'vertical'}}
      />
      <div style={{marginTop:8, display:'flex', gap:8}}>
        <button onClick={send} disabled={pending || !input.trim()}>
          {pending ? '전송 중…' : '보내기'}
        </button>
        <small style={{color:'#666'}}>Enter로 전송, Shift+Enter 줄바꿈</small>
      </div>
    </div>
  );
}
