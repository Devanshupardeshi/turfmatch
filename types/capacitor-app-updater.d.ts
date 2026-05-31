declare module "@capacitor-community/app-updater" {
  export interface AppUpdateInfo {
    currentVersion: string
    availableVersion: string
    url?: string
  }

  export interface GetAppUpdateInfoOptions {
    url: string
  }

  export interface UpdateAppOptions {
    url: string
  }

  export const AppUpdater: {
    getAppUpdateInfo(options: GetAppUpdateInfoOptions): Promise<AppUpdateInfo>
    updateApp(options: UpdateAppOptions): Promise<void>
  }
}
