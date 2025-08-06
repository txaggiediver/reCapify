import Flashbar from "@cloudscape-design/components/flashbar";
import { createContext, useState } from "react";

interface NotificationContextType {
    addNotification: (notification: NotificationItem) => void;
    removeNotification: (id: string) => void;
}

interface NotificationItem {
    id?: string;
    type: "success" | "error" | "info" | "warning";
    content: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}

export const NotificationContext = createContext<NotificationContextType>({
    addNotification: () => {},
    removeNotification: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);

    const addNotification = (notification: NotificationItem) => {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications((current) => [...current, { ...notification, id }]);
    };

    const removeNotification = (id: string) => {
        setNotifications((current) =>
            current.filter((notification) => notification.id !== id)
        );
    };

    return (
        <NotificationContext.Provider value={{ addNotification, removeNotification }}>
            <Flashbar 
                items={notifications.map(notification => ({
                    ...notification,
                    onDismiss: notification.dismissible 
                        ? () => {
                            removeNotification(notification.id!);
                            notification.onDismiss?.();
                        }
                        : undefined
                }))}
            />
            {children}
        </NotificationContext.Provider>
    );
}

export default NotificationContext;
