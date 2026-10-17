type OpenNotification = (data: Record<string, string>) => void;

export function stopPush() {}
export async function initializePush(_onOpen: OpenNotification, _onMessage?: () => void): Promise<() => void> { return () => {}; }
export async function enablePush(_onOpen?: OpenNotification, _onMessage?: () => void): Promise<() => void> {
  throw new Error('Bản web test hỗ trợ hộp thư thông báo trong app. Push notification cần kiểm tra trên ứng dụng Android hoặc iOS.');
}
export const enableNotifications = enablePush;
