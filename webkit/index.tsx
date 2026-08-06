import { SteamWrappedController } from "./application/steam-wrapped-controller";

const CONTROLLER_KEY = "__steamWrappedController__";

interface SteamWrappedWindow extends Window {
  [CONTROLLER_KEY]?: SteamWrappedController;
}

/** Millennium loads this module in Steam's Store WebKit browser view. */
export default function SteamWrapped(): void {
  const steamWindow = window as SteamWrappedWindow;
  steamWindow[CONTROLLER_KEY]?.stop();

  const controller = new SteamWrappedController();
  steamWindow[CONTROLLER_KEY] = controller;
  controller.start();
}
