import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';

import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { AppRouter } from './router/AppRouter';

import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <Provider store={store}>
      <BrowserRouter>
        <div>
          <a href="https://vitejs.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>

        <h1>Calendar App (Vite + React)</h1>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            count is {count}
          </button>
          <p>
            <code>src/App.jsx</code> 수정 후 저장하면 HMR이 작동합니다.
          </p>
        </div>

        {/* 🔹 실제 앱 라우팅 */}
        <AppRouter />

        <p className="read-the-docs">
          위 버튼을 눌러 상태 변화를 테스트하거나
          <br />
          캘린더 페이지에서 로그인 후 일정을 관리해보세요.
        </p>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
