

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SPECIFY_PERSONAL_ACCESS_TOKEN: string;
    }
  }
}

export {};
