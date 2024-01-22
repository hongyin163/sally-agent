export interface ITool {

}

export interface IAgent {
    tools: ITool[]
}

export interface IChatBase {
    agents: IAgent[]

}

export interface IChatRoom { }

export interface IChatBox { }

