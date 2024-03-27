import { ChatMessageType, ChatMessageWithoutId, IChatMessage, QuickReplyItem, Sender } from "chat-list/types/message";
// import { Role } from "./chat";
import { ReactNode } from "react";
import { extractMentions, memoize, removeMentions, sleep, snakeToWords, uuid } from "chat-list/utils";
import { GptModel, IChatBody, IChatResult, ICompletionsBody, IMessageBody, Role, ToolFunctinCall, ToolFunction } from "./chat";
import CardMute from 'chat-list/components/card-mute'
import React from "react";
import { IUserState } from "./user";
import { AGENT_AGENT, AGENT_TOOL, getLocalStore } from "chat-list/local/local";


export interface IModelConfig {
    model?: GptModel;
    temperature?: number;
    prompt?: string;
}

export type DocType = 'sheet' | 'doc' | 'slide';

export type Platform = 'google' | 'office' | 'other';

export interface FileAccept {
    image?: boolean;
    text?: boolean;
    video?: boolean;
    audio?: boolean;
}
export interface IChatPluginRenderProps {
    context: ChatState;
}

export type IToolFunction = (args: {
    from?: Sender,
    dataContext?: string,
    context?: ChatState,
    [x: string]: unknown
}) => Promise<string>;

export interface ITool {
    name: string;
    description: string;
    parameters: { [x: string]: unknown };
    func: IToolFunction;
}

export interface IChatPlugin {
    /**
     * id
     */
    id?: string;
    context: ChatState;
    /**
     * suport models value include :'gpt-3.5-turbo' | 'gpt-4' | 'gemini-pro' | 'gemini-pro-vision';
     */
    models?: GptModel[];
    /**
     * document type
     */
    docType?: DocType;
    /**
     * is custome agent
     */
    isCustom: boolean;
    /**
     * Add-on name, shown in placeholder
     */
    name: string;
    /**
     * Icon of plugin
     */
    icon: string | React.ReactNode | any;
    /**
     * Plugin startup command that uniquely identifies the plugin, starts with /.
     */
    action: string;
    /**
     * instruction of agent
     */
    instruction: string;
    /**
     * descrition for command list
     */
    shortDescription: string;
    /**
     * descrition for agent as a tool
     */
    description: string;
    /**
     * Parameters need to pass to gpt functions
     */
    parameters?: { type: string, properties: any }
    /**
     * Show placeholder in message input box
     */
    placeholder?: string;
    /**
     * When the user enters a command, use this field to reply user
     * to tell user how to use this feature,or show a card
     */
    introduce: string | (() => React.ReactNode);
    model?: IModelConfig;
    tools: string[];
    agents: string[];
    quickReplies: (input: string) => QuickReplyItem[];
    onQuickReply: (quickReply: QuickReplyItem) => void;
    /**
     * Shen get message from GPT, we can use this function to detect it and transfer to 
     * another messsage type
     * @param message 
     * @returns 
     */
    transfer?: (message: IChatMessage) => Promise<IChatMessage>;
    /**
     * From agent part, once sent message to user ,exec this function
     * if gpt sent message, we can use this function get that message
     * @param input 
     * @returns 
     */
    onSend?: (input: IChatMessage) => void;
    /**
     * From agent part, once user sent message, agent will receive message, exec this funcion
     * agent can receive message ,then sent user message
     * if define this function , the response will make in this function, so will not call GPT.
     * if don't define this function, will call GPT to handle user message
     * @param message 
     * @returns 
     */
    onReceive?: (message: IChatMessage) => Promise<IChatMessage | null>;
    /**
     * Excute on Plugin is loaded first
     * @returns 
     */
    onLoad?: () => void;
    shortTermMemory: IMessageBody[];
    memory: IMessageBody[];
    sendTaskSuccessMsg: (result: string, from: IChatMessage['from']) => void;
    chatWithAgent: (message: IChatMessage) => Promise<void>;
    /**
     * Set file  agent can accept
     */
    fileConfig?: {
        accept?: FileAccept,
        maxSize?: number,
        maxFiles?: number,
        multiple?: boolean,
    };
    render?: () => React.ReactNode;
    [x: string]: any;
}

export abstract class ChatPluginBase implements IChatPlugin {
    context: ChatState;
    id?: string;
    // models?: GptModel[] = [LlmModel.GPT3_5_TURBO, LlmModel.GPT4]
    docType?: DocType;
    isCustom = false;
    icon: string | React.ReactElement | any;
    action: string;
    shortDescription: string;
    description: string;
    instruction = '';
    parameters?: { type: string; properties: any; };
    placeholder?: string;
    introduce: string | (() => ReactNode);
    model: IModelConfig = {
        temperature: 0.7
    };
    name: string;
    config: IModelConfig = {
        temperature: 0.7
    };
    quickReplies = () => [] as any;
    onQuickReply: (quickReply: QuickReplyItem) => void;
    onSend?: (input: IChatMessage) => void;
    onLoad?: () => void;
    transfer?: (message: IChatMessage) => Promise<IChatMessage>
    shortTermMemory: IMessageBody[] = [];
    memory: IMessageBody[] = [];
    tools: string[] = [];
    agents: string[] = [];
    injectContext: () => Promise<string>;
    buildChatMessage(content: string | React.ReactNode, type: ChatMessageType = 'text', to?: string, role?: Role, alt?: string): IChatMessage {
        // let msgContent = content;

        let text = '', files: File[] = [], card;

        if (type === 'parts') {
            text = (content as any).text;
            files = (content as any).fileList;
        } else if (type === 'text') {
            text = content as string;
        } else if (type === 'file') {
            files = content as File[]
        } else if (type === 'card') {
            card = content as React.ReactNode
        }
        let msgContent = text;
        if (to && type === 'text') {
            msgContent = `@${to}\n${text}`;
        }
        return {
            _id: uuid(),
            type,
            content: alt || msgContent,
            position: role == 'user' ? 'right' : 'left',
            role: role || 'assistant',
            to: to || '',
            mentions: [to] || [],
            card,
            files,
            text,
            from: {
                icon: this.icon,
                avatar: this.icon,
                name: this.action
            }
        }
    }
    async sendMsg(message: IChatMessage) {
        await this.context.sendMsg(message);
    }
    async sendTaskSuccessMsg(result: string, to: IChatMessage['from']) {

        if (!result) {
            await this.sendMsg(this.buildChatMessage(`Task completed.`, 'text', to?.name));
        } else {
            await this.sendMsg(this.buildChatMessage(result, 'text', to?.name));
        }
        this.context.setTyping(false)
    }
    failedMessage(reason: string, to: IChatMessage['from']) {
        return this.buildChatMessage(`Task executed failed, reason: ${reason}`, 'text', to?.name);
    }
    modelConfig: IModelConfig = null;
    async chatWithAgent(message: IChatMessage) {
        if (this.context.mute) {
            this.context.appendMsg(this.buildChatMessage(<CardMute message={message} onContinue={() => {
                this.context.setMute(false);
                this.context.sendMsg(message)
            }} />, 'card'))
            return;
        }

        if (typeof message.text === 'string' && message.content.startsWith('@')) {
            message.mentions = extractMentions(message.content);
            message.content = removeMentions(message.content);
            message.text = message.content;
        }

        if (message.content == 'hello' || message.content == 'hi') {
            await sleep(3000);
            this.context.appendMsg(this.buildChatMessage('Hello! How can I assist you today?', 'text'));
            return;
        }

        if (message.content == '你好' || message.content == '你好呀') {
            await sleep();
            this.context.appendMsg(this.buildChatMessage('你好！有什么我可以帮助你的吗？', 'text',));
            return;
        }
        try {
            const msg = await this.onReceive(message);
            if (msg) {
                this.context.sendMsg(msg);
            }
        } finally {
            this.context.setTyping(false)
        }
    }
    /**
     * use this function to send context message and system message to LLM
     * @param instrunction system message, if not set use plugin model config
     * @param tools function call setting
     */
    async chat(input = '', instrunction = '', tools: ToolFunction[] = void 0) {
        const prompt = instrunction || this.instruction;
        // let temperature = 0.7;
        const config = this.model || { temperature: 0.7 };
        const temperature = typeof config.temperature === 'undefined' ? 0.7 : config.temperature;

        this.memory.push({
            role: 'user',
            content: input
        })
        const context = [{ role: 'system', content: prompt }] as IMessageBody[];
        const messages = context.concat(this.memory);
        const result = await this.context.chat({
            messages,
            temperature,
            tools
        });
        if (result.content) {
            this.memory.push({
                role: 'assistant',
                content: result.content
            })
        }
        return result;
    }
    getTools = () => {
        const { docType } = this.context;
        const agentToolKey = `${docType}_${AGENT_TOOL}_${this.action}`;
        const tools = this.tools;
        const agentTools: IAgentToolItem[] = getLocalStore(agentToolKey)
        if (!agentTools) {
            return (tools.map((name) => {
                return {
                    id: name,
                    name: snakeToWords(name),
                    enable: true
                }
            }));
        } else {
            const newList = agentTools.filter(p => {
                return tools.find(name => p.id === name)
            }).concat(tools.filter(p => {
                return !agentTools.find(item => item.id === p)
            }).map((name) => {
                return {
                    id: name,
                    name: snakeToWords(name),
                    enable: true
                }
            }))
            return newList;
        }
    }
    getAgents = () => {
        const { docType, plugins } = this.context;
        const colAgentKey = `${docType}_${AGENT_AGENT}_${this.action}`;
        const agents = this.agents || [];
        const colAgents = getLocalStore(colAgentKey)
        if (!colAgents) {
            return (agents.map((name) => {
                const plg = plugins.find(p => p.action == name);
                return {
                    id: plg.action,
                    icon: plg.icon,
                    name: plg.name,
                    enable: true
                }
            }));
        }
        return colAgents;
    }
    buildAgentTools = memoize((colAgents: IAgentToolItem[]) => {
        const { plugins } = this.context;
        const enableAgentsMap: { [x: string]: boolean } = colAgents.filter(p => p.enable).reduce((acc, tool) => {
            return {
                ...acc,
                [tool.id]: true
            }
        }, {});
        const toolList = plugins.filter(p => enableAgentsMap[p.action]);
        const agents: ToolFunction[] = toolList.map((plg) => {
            return {
                type: 'function',
                function: {
                    name: plg.action,
                    description: plg.description,
                    parameters: {
                        "type": "object",
                        "properties": {
                            "content": {
                                "type": "string",
                                "description": 'task description',
                            },
                        },
                        "required": ['content']
                    }
                }
            }
        });
        const agentMap = toolList.reduce((acc, tool) => {
            if (tool.action) {
                acc[tool.action] = tool;
            }
            return acc;
        }, {} as Record<string, any>);
        return {
            agents,
            agentMap,
        };
    })
    buildTools = memoize((agentTools: IAgentToolItem[]) => {
        const { tools } = this.context;
        if (agentTools.length <= 0) {
            return {
                toolMap: {},
                tools: void 0,
            }
        }
        const enableToolMap: { [x: string]: boolean } = agentTools.filter(p => p.enable).reduce((acc, tool) => {
            return {
                ...acc,
                [tool.id]: true
            }
        }, {});
        const tarTools = tools.filter(p => enableToolMap[p.name]);
        const toolMap = tarTools.reduce((acc, tool) => {
            if (tool.name) {
                acc[tool.name] = tool.func;
            }
            return acc;
        }, {} as Record<string, any>);

        const toolList: ToolFunction[] = tarTools.map(({ name, description, parameters }) => {
            return {
                type: 'function',
                function: {
                    name,
                    description,
                    parameters
                },

            }
        })
        return {
            toolMap,
            tools: toolList && toolList.length == 0 ? undefined : toolList
        }
    })
    buildAllTools = () => {
        const agentTools: IAgentToolItem[] = this.getTools();
        const colAgents: IAgentToolItem[] = this.getAgents();
        // const { agentTools, colAgents } = this.context;
        // debugger;
        const { toolMap = {}, tools = [] } = this.buildTools(agentTools);
        const { agentMap = {}, agents = [] } = this.buildAgentTools(colAgents);
        return {
            tools: tools.concat(agents),
            toolMap: {
                ...toolMap,
                ...agentMap
            }
        }
    }
    handleTools = async (tool_call: ToolFunctinCall, toolMap: any, dataContext: any) => {
        const args = JSON.parse(tool_call.function.arguments);
        const name = tool_call.function.name;

        const res = await toolMap[name]({
            ...args,
            from: {
                name: this.action,
                icon: this.icon
            },
            context: this.context,
            dataContext
        });
        return res;
    }
    handleAgents = async (message: IChatMessage, tool_call: ToolFunctinCall, agentMap: any,) => {
        const { text } = message;
        const { setTyping, plugin, plugins, chat, appendMsg, updateMsg, dataAsContext } = this.context;

        const name = tool_call.function.name;
        const content = text; //JSON.parse(tool_call.function.arguments)?.content || text;

        // const agent = plugins.find(p => p.action == name);
        const agent = agentMap[name];

        appendMsg(this.buildChatMessage(content, 'text', agent.action, 'assistant',));

        let nextMessage = this.buildChatMessage(content, 'text', agent.action, 'assistant',)
        if (message.type == 'parts') {
            nextMessage = this.buildChatMessage({ text: content, fileList: message.files } as any, 'parts', agent.action, 'assistant',)
        }
        setTyping(true)
        const agentReply: any = await agent.onReceive(nextMessage)
        // console.log(agent.action, agentReply)
        appendMsg(agentReply);
        // this.memory.push({
        //   "tool_call_id": tool_call.id,
        //   "role": "tool",
        //   "name": name,
        //   "content": agentReply.content,
        // })
        return agentReply.content;
    }
    summaryHistory = async (memory: IMessageBody[]): Promise<IMessageBody[]> => {
        const summaryPrompt = `You can help me summarize messages, be concise and don't leave out information.`;
        const result = await this.context.chat(
            {
                messages: [{ role: 'system', content: summaryPrompt },
                ...memory,
                { role: 'user', content: 'Please summarize the conversation.' }
                ]
            });
        return [
            {
                role: 'assistant', content: `\n[History]\n${result.content}`
            },
        ];
    }
    handleToolCall = async (message: IChatMessage, response: IChatResult, toolMap: any, dataContext: string) => {
        const { tool_calls } = response;
        this.memory.push({ role: 'assistant', content: response.content, tool_calls: tool_calls })
        for (let i = 0; i < tool_calls.length; i++) {
            const tool_call = tool_calls[i];
            const name = tool_call.function.name;
            try {
                let res;
                if (typeof toolMap[name] === 'function') {
                    res = await this.handleTools(tool_call, toolMap, dataContext)
                }
                if (typeof toolMap[name] === 'object') {
                    res = await this.handleAgents(message, tool_call, toolMap)
                }

                if (typeof res === 'string') {

                    this.memory.push({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": name,
                        "content": res,
                    })
                } else if (typeof res == 'object' && typeof res.type === 'string') {
                    this.memory.push({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": name,
                        "content": res.content
                    })
                } else {
                    this.memory.push({
                        "tool_call_id": tool_call.id,
                        "role": "tool",
                        "name": name,
                        "content": JSON.stringify(res),
                    })
                }

            } catch (e) {
                this.memory.push({
                    "tool_call_id": tool_call.id,
                    "role": "tool",
                    "name": name,
                    "content": 'Task execution failure',
                })
            }

        }
    }
    onReceive = async (message: IChatMessage) => {
        const { setTyping, chat, plugins, appendMsg } = this.context;
        // no plugin ,chat with GPT
        setTyping(true);

        if (this.memory.length > 10) {
            this.memory = await this.summaryHistory(this.memory);
        }

        let loopCount = 20;
        // eslint-disable-next-line no-constant-condition
        const stream = false;
        let instruction = this.instruction;
        let dataContext = this.context.dataContext;
        if (dataContext) {
            instruction = `${this.instruction}\n\n${dataContext}`;
        } else if (this.injectContext) {
            const additionalContext = await this.injectContext();
            instruction = `${this.instruction}\n\n${additionalContext}`;
            dataContext = additionalContext;
        }
        const context: IMessageBody[] = [{
            role: 'system',
            content: instruction,
        }]
        this.memory.push({
            role: 'user',
            content: message.content
        });

        const { tools, toolMap } = this.buildAllTools();
        try {
            while (--loopCount > 0) {
                const result = await chat({
                    messages: context.concat(this.memory),
                    temperature: this.model?.temperature || 0.7,
                    tools,
                    stream
                });

                if (result.content) {
                    if ((!result.tool_calls || result.tool_calls.length === 0)) {
                        this.memory.push({ role: 'assistant', content: result.content })
                        return this.buildChatMessage(result.content);
                    } else {
                        await this.handleToolCall(message, result, toolMap, dataContext)
                    }

                } else if (result.tool_calls && result.tool_calls.length > 0) {
                    await this.handleToolCall(message, result, toolMap, dataContext)
                } else {
                    break;
                }
            }
            if (loopCount <= 0) {
                console.log('loopCount', loopCount);
                this.memory.push({
                    role: 'user',
                    content: 'Ok,Ignore exceptions,please summarize infomation above.'
                })
                const result = await chat({
                    messages: context.concat(this.memory),
                    temperature: this.model?.temperature || 0.7,
                    tools,
                    stream
                });
                return this.buildChatMessage(result.content);
            }

        } catch (e) {
            return this.failedMessage(e.message, message.from);
        } finally {
            setTyping(false);
        }
    }

}

export interface IAgentToolItem { id: string, name: string, icon?: string, enable: boolean }

export interface IAgentTools {
    agentTools: IAgentToolItem[];
    colAgents: IAgentToolItem[];
    setAgentTool: (name: string, enable: boolean) => void;
    setColAgent: (name: string, enable: boolean) => void;
    setAgentTools: (list: IAgentToolItem[]) => void;
    setColAgents: (list: IAgentToolItem[]) => void;
    reset: () => void;
}

export type ChatState = {
    platform: Platform;
    text: string;
    loading: boolean;
    typing: boolean;
    plugins: IChatPlugin[];
    setPlugins?: (plugins: IChatPlugin[]) => void;
    plugin: IChatPlugin;
    setPlugin?: (plugin: IChatPlugin) => void;
    messages: IChatMessage[];
    replies: QuickReplyItem[];
    quickReply: (item: QuickReplyItem, index: number) => void;
    appendMsg: (message: IChatMessage) => void;
    resetList: (message?: IChatMessage[]) => void;
    setTyping: (typing: boolean) => void;
    prependMsgs: (messages: IChatMessage[]) => void;
    updateMsg: (messageId: string, messages: ChatMessageWithoutId) => void;
    sendMsg: (message: IChatMessage) => void;
    setText: (content: string) => void;
    chat: (body: IChatBody, callback?: (done: boolean, text: string, stop: () => void) => void) => Promise<IChatResult>;
    completions?: (body: ICompletionsBody) => Promise<string>;
    user: IUserState;
    docType?: DocType;
    mode: 'plugin' | 'chat';
    setMode?: (mode: 'plugin' | 'chat') => void;
    mute?: boolean;
    setMute?: (mute?: boolean) => void;
    model?: GptModel,
    setModel?: (model: GptModel) => void;
    dataContext?: string;
    setDataContext?: (dataContext: string) => void;
    dataAsContext: boolean;
    setDataAsContext?: (dataAsContext: boolean) => void;
    tools: ITool[];
    agentTools: IAgentToolItem[];
    colAgents: IAgentToolItem[];
    setAgentTool: (name: string, enable: boolean) => void;
    setColAgent: (name: string, enable: boolean) => void;
    setAgentTools: (list: IAgentToolItem[]) => void;
    setColAgents: (list: IAgentToolItem[]) => void;
};

