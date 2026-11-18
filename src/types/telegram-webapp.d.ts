export {};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initDataUnsafe?: {
          user?: { id: number; first_name?: string; last_name?: string };
        };
      };
    };
  }
}
