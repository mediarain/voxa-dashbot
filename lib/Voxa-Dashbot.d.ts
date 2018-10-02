import { VoxaApp } from "voxa";
export interface IVoxaDashbotConfig {
    debug?: boolean;
    suppressSending?: boolean;
    api_key?: string;
    alexa?: string;
    dialogflow?: string;
    botframework?: string;
}
export declare function register(skill: VoxaApp, config: IVoxaDashbotConfig): void;
