import { IChatBody, IChatResult, ICompletionsBody } from "chat-list/types/chat";
import { ITableOption } from "./sheet";

export interface IChatWithPromptOptions {
    prompt: string;
    temperature: number;
}
export interface IDocService {
    insertTable: (value: string[][], options: ITableOption) => Promise<void>;
    insertText: (value: string) => Promise<void>;
    getSelectedText: () => Promise<string>;
    getDocumentContent: () => Promise<string>;
    registSelectEvent?: (callback: (text: string) => void) => Promise<void>;
}
