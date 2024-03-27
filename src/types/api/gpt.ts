import { IChatBody, IChatResult, ICompletionsBody, IEmbeddingsBody } from "chat-list/types/chat";

export interface IGptService {
    speechToText: (value: string) => Promise<string>;
    chat: (body: IChatBody, callback?: (done: boolean, text: string, stop: () => void) => void) => Promise<IChatResult>;
    completions: (body: ICompletionsBody) => Promise<string>;
    embeddings: (body: IEmbeddingsBody) => Promise<number[]>;
}