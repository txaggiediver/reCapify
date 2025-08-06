import Flashbar from "@cloudscape-design/components/flashbar";
import { createContext, useState } from "react";

interface NotificationItem {
    id?: string;
    type: "success" | "error" | "info" | "warning";
    content: string;
    dismissible?: boolean;
    onDismiss?: () => void;
}

export interface NotificationContextType {
    addNotification: (notification: NotificationItem) => void;
    removeNotification: (id: string) => void;
    updateFlashbar: (type: "success" | "error" | "info" | "warning", message: string) => void;
}

export const NotificationContext = createContext<NotificationContextType>({
    addNotification: () => {},
    removeNotification: () => {},
    updateFlashbar: () => {},
});

export const FlashbarComponent = ({ items }: { items: NotificationItem[] }) => (
    <Flashbar items={items} />
);

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

    const updateFlashbar = (type: "success" | "error" | "info" | "warning", message: string) => {
        addNotification({
            type,
            content: message,
            dismissible: true,
        });
    };

    return (
        <NotificationContext.Provider value={{ addNotification, removeNotification, updateFlashbar }}>
            <FlashbarComponent 
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
