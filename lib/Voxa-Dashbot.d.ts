import { VoxaApp } from "voxa";
export interface IVoxaDashbotConfig {
    alexa?: string;
    api_key?: string;
    botframework?: string;
    debug?: boolean;
    dialogflow?: string;
    printErrors?: boolean;
    redact?: boolean;
    suppressSending?: boolean;
    timeout?: number;
}
export declare function register(skill: VoxaApp, config: IVoxaDashbotConfig): void;
