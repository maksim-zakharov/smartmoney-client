import { createRoot } from 'react-dom/client';
import './index.css';
import { Provider } from 'react-redux';
import { store } from './store';
import { HashRouter } from 'react-router-dom';
import 'moment/locale/ru';
import moment from 'moment'; // without this line it didn't work
import ru_RU from 'antd/es/locale/ru_RU';
import updateLocale from 'dayjs/plugin/updateLocale';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import { ConfigProvider } from 'antd';
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
      <ConfigProvider
        locale={ru_RU}
        theme={{
          token: {
            // Seed Token
            colorBgLayout: 'rgb(23, 35, 46)', // 'rgb(30,44,57)',
            colorBgElevated: 'rgb(30, 44, 57)',
            colorBgBase: 'black', // 'rgb(30,44,57)',
            colorBorderBg: 'black', // 'rgb(23, 35, 46)',
            colorTextBase: 'rgb(166, 189, 213)',
            borderRadius: 2,

            colorPrimary: 'rgb(179, 199, 219)',
            colorText: 'rgb(166, 189, 213)',

            // Alias Token
            //   colorBgElevated:  'rgb(30,44,57)',
            colorBgContainer: 'rgb(23, 35, 46)',
          },
        }}
      >
        <App />
      </ConfigProvider>
    </Provider>
  </HashRouter>,
  // </StrictMode>,
);
