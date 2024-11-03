import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import "./index.css";
import App from "./App";
import {Provider} from "react-redux";
import {store} from "./store";
import {BrowserRouter} from "react-router-dom";
import 'moment/locale/ru'
import moment from "moment/moment"; // without this line it didn't work
import ru_RU from 'antd/es/locale/ru_RU';
import updateLocale from "dayjs/plugin/updateLocale";
import {ConfigProvider} from "antd";
import dayjs from "dayjs";
import "dayjs/locale/ru";

dayjs.extend(updateLocale);
dayjs.updateLocale("zh-cn", {
    weekStart: 0
});

moment().locale('ru');

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Provider store={store}>
                <ConfigProvider locale={ru_RU}
                                theme={{
                                    token: {
                                        // Seed Token
                                        colorBgLayout: 'black', // 'rgb(30,44,57)',
                                        colorBgBase: 'black', // 'rgb(30,44,57)',
                                        colorBorderBg: 'black', // 'rgb(23, 35, 46)',
                                        colorTextBase: 'rgb(166, 189, 213)',
                                        borderRadius: 2,

                                        colorPrimary: "rgb(179, 199, 219)",
                                        colorText: 'rgb(166, 189, 213)',

                                        // Alias Token
                                        //   colorBgElevated:  'rgb(30,44,57)',
                                        colorBgContainer: 'rgb(23, 35, 46)',
                                    }
                                }}
                >
                    <App/>
                </ConfigProvider>
            </Provider>
        </BrowserRouter>
    </StrictMode>
);
