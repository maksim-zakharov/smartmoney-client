import React, { Component } from 'react';
import {Button, Result} from "antd";

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Логируем ошибку для отладки (например, в внешнюю систему логирования)
        console.error("Error caught by ErrorBoundary: ", error, errorInfo);
        this.setState(prev => ({...prev, error}))
    }

    render() {
        if (this.state.hasError) {
            return  <Result
                status="error"
                title={this.state.error?.message}
            />
        }
        return this.props.children;
    }
}

// HOC, который оборачивает компонент в ErrorBoundary
export const withErrorBoundary = (WrappedComponent) => {
    return (props) => (
        <ErrorBoundary>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );
};
