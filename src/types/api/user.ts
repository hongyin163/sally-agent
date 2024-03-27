import { IUserOrderState } from "chat-list/types/license";
import { IApiLimit, IUserMessage } from "chat-list/types/user";
import { IAgent } from "../agent";


export interface IUserService {
    login: (license: string) => Promise<string>;
    getEmail: () => Promise<string>;
    setUserProperty: (key: string, value: string) => Promise<void>;
    getUserProperty: (key: string) => Promise<string>;
    checkUser: () => Promise<IUserOrderState>;
    apiLimit?: () => Promise<IApiLimit>;
    getPoints?: () => Promise<number>;
    sentMessage?: (message: IUserMessage) => Promise<void>;
    deductPoints?: (message: IUserMessage) => Promise<void>;
    getAgents?: (params: { email: string, type: string }) => Promise<IAgent[]>;
    updateAgent?: (agent: IAgent) => Promise<void>;
    addAgent?: (agent: IAgent) => Promise<void>;
    getAgent?: (id: string) => Promise<IAgent>;
}
