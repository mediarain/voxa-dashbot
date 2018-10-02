import { VoxaApp } from "voxa";
export interface IVoxaDashbotConfig {
    alexa?: string;
    api_key?: string;
    botframework?: string;
    debug?: boolean;
    dialogflow?: string;
    suppressSending?: boolean;
}
export declare function register(skill: VoxaApp, config: IVoxaDashbotConfig): void;
