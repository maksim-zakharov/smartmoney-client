import { createRoot } from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { HashRouter } from 'react-router-dom';
import 'moment/locale/ru';
import moment from 'moment'; // without this line it didn't work
import updateLocale from 'dayjs/plugin/updateLocale';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import App from './App';

dayjs.extend(localizedFormat);
dayjs.extend(updateLocale);
dayjs.locale('ru');
// dayjs.updateLocale("zh-cn", {
//     weekStart: 0
// });

moment().locale('ru');

createRoot(document.getElementById('root')!).render(
  // <StrictMode>
  <HashRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </HashRouter>,
  // </StrictMode>,
);
