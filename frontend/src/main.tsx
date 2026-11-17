import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { setUnauthorizedHandler, tokenStore } from './api/client';
import { store } from './store';
import { loggedOut } from './store/actions';

// If the API rejects our token (expired / revoked), drop the session everywhere.
setUnauthorizedHandler(() => {
  tokenStore.clear();
  store.dispatch(loggedOut());
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
