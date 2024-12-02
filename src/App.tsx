import {Content, Header} from "antd/es/layout/layout";
import {Layout, Menu, theme} from "antd";
import React from "react";
import {Route, Routes, useLocation, useNavigate} from "react-router-dom";
import MainPage from "./MainPage.tsx";
import TestPage from "./TestPage/TestPage.tsx";
import {ArbitrageMOEXPage} from "./ArbitrageMOEXPage";

export default function App() {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        token: {colorBgContainer, borderRadiusLG}
    } = theme.useToken();

    const menuItems = [
        {key: '/', label: 'Главная', element: <MainPage/>},
        {key: '/test', label: 'BOS/CHoCH', element: <TestPage/>},
        {key: '/arbitrage-moex', label: 'Арбитраж MOEX', element: <ArbitrageMOEXPage/>}
    ]

    function onClick(params){
        console.log(params)
        navigate(params.key);
    }

    return <Layout>
        <Header style={{display: 'flex', alignItems: 'center'}}>
            <div className="demo-logo"/>
            <Menu
                theme="dark"
                mode="horizontal"
                defaultSelectedKeys={[location.pathname]}
                onClick={onClick}
                items={menuItems}
                style={{flex: 1, minWidth: 0}}
            />
        </Header>
        <Content
            style={{
                padding: 8,
                margin: 0,
                minHeight: 280,
                background: colorBgContainer,
                borderRadius: borderRadiusLG
            }}
        >
            <Routes>
                {menuItems.map(item => <Route path={item.key} element={item.element}/>)}
            </Routes>
        </Content>
    </Layout>
}