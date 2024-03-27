import { Role } from "./chat";

export type Sender = {
  name: string;
  avatar?: string;
  icon?: string;
}

export type ChatMessageType = 'text' | 'card' | 'image' | 'file' | 'video' | 'audio' | 'progress' | 'parts' | 'typing';

/**
 * Used in API , server datebase entity 
 */
export interface IMessageEntity {
  id?: string | number;
  conversationId: string | number;
  senderId: string | number;
  email: string;
  content: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Used in chat ui
 */
export interface IChatMessage {

  _id: string;
  type: ChatMessageType;
  content?: string | React.ReactNode | any;
  to?: string;
  mentions?: string[];
  from?: Sender,
  role?: Role,
  position?: 'left' | 'right' | 'center' | 'pop';
  createdAt?: number;
  hasTime?: boolean;
  files?: File[];
  text?: string;
  card?: React.ReactNode;
}

export type IChatMessages = IChatMessage[];

export type ChatMessageWithoutId = Omit<IChatMessage, '_id'> & {
  _id?: string;
};

export interface QuickReplyItem {
  name: string;
  tip?: string;
  code?: string;
  icon?: string;
  img?: string;
  isNew?: boolean;
  isHighlight?: boolean;
}
export interface QuickReplyProps {
  item: QuickReplyItem;
  index: number;
  onClick: (item: QuickReplyItem, index: number) => void;
}
