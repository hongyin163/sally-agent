export interface User {
  id: number;
  username: string;
  password: string;
  email: string;
  registrationDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IUserContextState {
  user: IUserState;
  loading: boolean;
  setUserState: (user: Partial<IUserState>) => void;
  gptFreelimit: number;
  setGptFreelimit: (limit: number) => void;
}

export interface IUserState {
  id: number;
  username: string;
  email: string;
  image?: string;
  state: 'free' | 'paid';
  order: string;
  version: 'standard' | 'pro';
  gpt: 0 | 1;
  exp: number;
  gptLimit: number;
  noApiKey: boolean;
  interval?: 'year' | 'month';
  points?: number;
  // Is sign up
  isAuthenticated?: boolean;

}

export interface IApiLimit {
  gpt3Count: number;
  gpt4Count: number;
  freeCount: number;
  lastResetTimestamp: Date;
}

export interface IUserMessage {
  conversationId?: string;
  senderId?: string;
  receiverId?: string;
  content: string,
  agent: string,
  email?: string,
  model: string,
}