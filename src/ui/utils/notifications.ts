/**
 * Helper function to show Windows notifications
 * Replaces Chakra UI toast notifications
 */
export const showNotification = async (options: {
  title: string;
  description?: string;
  status?: "success" | "error" | "warning" | "info";
  duration?: number;
  isClosable?: boolean;
}) => {
  await window.ElectronAPI.invoke.showNotification({
    title: options.title,
    body: options.description,
    status: options.status || "info",
    duration: options.duration || 3000,
  });
};

