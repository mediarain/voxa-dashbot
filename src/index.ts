import { IDashbot } from "./events";
export { register } from "./Voxa-Dashbot";

declare module "voxa" {
  interface IVoxaEvent {
    dashbot?: IDashbot;
  }
}
