import useMessages from 'chat-list/hook/useMesssages'
import {
  ChatState,
  DocType,
  IChatPlugin,
} from 'chat-list/types/plugin';
import { ChatMessageWithoutId, IChatMessage } from 'chat-list/types/message';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { findPlugin } from 'chat-list/plugins';
import {
  IChatBody,
} from 'chat-list/types/chat';
import { UserContext } from 'chat-list/store/userContext';
import { chat, completions } from 'chat-list/service/message';
import { buildChatMessage } from 'chat-list/utils/chat';
import { absolute, platform, sleep, uuid } from 'chat-list/utils';
import { GPT_LIMIT_NUM } from 'chat-list/config/constant';
import CardPriacy from 'chat-list/components/card-privacy';
import { getUserPrivacyState } from 'chat-list/service/users';
import useLocalStore from 'chat-list/hook/useLocalStore';
import { publish, subscribe, unsubscribe } from 'chat-list/msb/public'
import { parseDocuments } from 'chat-list/utils/file';
import { logEvent, pageView } from 'chat-list/service/log';
import useModel from 'chat-list/hook/useModel';
import userApi from '@api/user';
import toolMap from 'chat-list/tools';
import useAgentTools from 'chat-list/hook/useAgentTools';

const PLATFORM = platform();

const ChatContext = createContext<Partial<ChatState>>({
  platform: PLATFORM,
  text: '',
  loading: false,
  typing: false,
  plugins: [],
  messages: [],
  plugin: null,
  replies: [],
  mode: 'plugin',
  mute: false,
  model: 'gpt-3.5-turbo',
  dataAsContext: false,
  dataContext: '',
  tools: []
});

const ChatProvider = ({
  docType,
  plugins: insidePlugins,
  children,
}: {
  docType: DocType;
  plugins: IChatPlugin[];
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const { user, setUserState, gptFreelimit, setGptFreelimit } = useContext(UserContext);
  const [plugins, setPlugins] = useState(insidePlugins)
  const tools = toolMap[docType];
  const [plugin, setPlugin] = useState<IChatPlugin>(
    plugins.find((p) => p.action === 'sally')
  );
  const {
    typing,
    messages,
    appendMsg,
    setTyping,
    prependMsgs,
    updateMsg,
    resetList,
    deleteMsg
  } = useMessages([]);
  // const [typing, setInputTyping] = useState(false);
  // const { response, typing, streaming, submit, abort } = useChat();
  const context = useRef<ChatState>(null);
  // const { value: mode, setValue: setMode } = useLocalStore(
  //   'sheet-chat-mode-',
  //   'plugin'
  // );
  const [mode, setMode] = useState<"plugin" | "chat">('plugin')
  const [mute, setMute] = useState(false);
  const { model, setModel } = useModel(plugin);
  const [conversationId, setConversationId] = useState(uuid());
  const { value: dataAsContext, setValue: setDataAsContext } = useLocalStore('sheet-chat-data-context', true);
  const [dataContext, setDataContext] = useState('');
  const { agentTools, colAgents, setAgentTools, setAgentTool, setColAgent, setColAgents } = useAgentTools(plugin, plugins, docType);
  // const { replies, updateReplies } = useQuickReplies(plugin, text, []);
  const [replies, setReplies] = useState([]);
  const [mentions, setMentions] = useState([])

  // const setTyping = useCallback((typeing: boolean) => {
  //   setBotTyping(typeing);
  //   setInputTyping(typeing);
  // }, [setBotTyping, setInputTyping])


  const handleAt = useCallback(
    (text: string, messages: any) => {
      const input = text.trimEnd().replace(/^[@/]/g, '');
      // const command = extractCommand(text);
      const result = findPlugin(plugins, input);
      if (result.exact) {
        if (plugin && plugin.action === result.plugin.action) {
          return true;
        }
        if (plugin) {
          (plugin as any)['messages'] = messages;
        }
        const msgs = (result.plugin as any)['messages'];
        if (msgs) {
          resetList(msgs);
        } else {
          resetList([]);
        }
        // if exact match set default prompt
        pageView(result.plugin.action)
        setPlugin(result.plugin as IChatPlugin);

        return true;
      }
      return false;
    }, [plugin, plugins])


  const checkPrivacyState = useCallback(async () => {
    const privacyState = await getUserPrivacyState();
    if (!privacyState) {
      const msg = buildChatMessage(
        <CardPriacy
          onConfirm={() => {
            setTyping(true);
            setTimeout(() => {
              appendMsg(
                buildChatMessage(
                  `Welcome Aboard! 🚀 Thank you for confirming our Privacy Policy. We're excited to serve you. If you have any questions or need assistance, feel free to reach out. Let's get started!`,
                  'text',
                  'system'
                )
              );
              setTyping(false)
            }, 1000);
          }}
        />,
        'card',
        'system'
      );
      appendMsg(msg);
    }
    return privacyState;
  }, []);
  const loadMessages = useCallback(async () => {
    setLoading(true);
    let content: string | React.ReactNode =
      "Hi! I'm Sally, your AI assistant, you can type in `/start` to learn about and select desired features, or chat with me.";
    if (plugin) {
      content =
        typeof plugin.introduce == 'string'
          ? plugin.introduce
          : plugin.introduce();
    }
    const message: IChatMessage = buildChatMessage(
      content,
      typeof content == 'string' ? 'text' : 'card',
      'assistant',
      {
        icon: plugin.icon,
        name: plugin.action
      }
    );
    resetList([message]);
    await checkPrivacyState();
    setLoading(false);
  }, [plugin, checkPrivacyState, prependMsgs]);

  const quickReply = useCallback((item: any) => {
    if (item.action === 'abort') {
      // if (typing) {
      setMute(!mute);
      setTyping(false);
      appendMsg({
        role: 'user',
        content: mute ? 'Okay, you guys keep talking.' : 'Okay, you guys, stop talking!',
        type: 'text',
        position: 'right'
      })
      // }

      // abort();
      return;
    }
    if (plugin) {
      plugin.onQuickReply(item);
    }
  }, [plugin, typing, setTyping, mute]);


  const showProgress = () => {
    // const msg = buildChatMessage(0, 'progress', 'user')
    const msg: ChatMessageWithoutId = {
      _id: uuid(),
      type: 'progress',
      content: 0,
      position: 'right',
      role: 'user',
    }
    appendMsg(msg)
    const id = msg._id;
    return (value: number) => {
      // console.log(value)
      if (value === 100) {
        deleteMsg(id)
        return;
      }
      // console.log(id)
      const msg: ChatMessageWithoutId = {
        type: 'progress',
        content: value,
        position: 'right',
        role: 'user',
      }
      updateMsg(id, msg)
    }
  }

  const sendMsg = useCallback(async (message: IChatMessage) => {
    if (message.role === 'user' && user.state == 'free') {
      // logEvent(message.type, {
      //   message: message.type === 'text' ? message.content : '',
      // });
      // if (limit <= 0) {
      //   appendMsg(
      //     buildChatMessage(
      //       <p className="p-2">
      //         You have reached the limit of {GPT_LIMIT_NUM} GPT requests. Please upgrade
      //         your plan to continue.{' '}
      //         <a
      //           className="link"
      //           target="_blank"
      //           href={absolute('/#pricing')}
      //           rel="noreferrer"
      //         >
      //           Price and Plan
      //         </a>
      //       </p>,
      //       'card'
      //     )
      //   );
      //   return;
      // }
      // setLimit(limit - 1);
    }

    if (!message.role || message.role === 'user') {
      // role is null or role is user
      const privacyState = await checkPrivacyState();
      if (!privacyState) {
        return;
      }
      const { type, content } = message;
      const text = content as string;
      if (type === 'text' && text) {
        if (text === '/') {
          const home = plugins.find((p) => p.action === 'sally');
          setPlugin(home);
          resetList([]);
          // showIntro(home);
          return;
        }

        if (text.startsWith('@') || text.startsWith('/')) {
          const pass = handleAt(text, messages);
          if (pass) {
            return;
          }
        }

        if (user.state == 'free' && model === 'gpt-3.5-turbo') {
          if ((GPT_LIMIT_NUM - Number(gptFreelimit)) <= 0) {
            appendMsg(
              buildChatMessage(
                <p className="p-2">
                  You have reached the limit of {GPT_LIMIT_NUM} GPT requests. Please upgrade
                  your plan to continue.{' '}
                  <a
                    className="link"
                    target="_blank"
                    href={absolute('/#pricing')}
                    rel="noreferrer"
                  >
                    Price and Plan
                  </a>
                </p>,
                'card'
              )
            );
            return;
          } else {
            setGptFreelimit(Number((gptFreelimit + 1).toFixed(0)));
          }
        }
        // else if (user.state == 'paid' && user.gpt == 1 && model == 'gpt-4') {
        //   if (GPT4_LIMIT_NUM - Number(gpt4limit) <= 0) {
        //     appendMsg(
        //       buildChatMessage(
        //         <p className="p-2">
        //           You have reached the limit of {GPT4_LIMIT_NUM} GPT4 requests. Please use GPT3.5.
        //         </p>,
        //         'card'
        //       )
        //     );
        //     return;
        //   } else {
        //     setGpt4limit(Number((gpt4limit + 1).toFixed(0)));
        //   }
        // } else if (user.state == 'paid' && user.gpt == 1 && model == 'gpt-3.5-turbo') {
        //   if (GPT3_LIMIT_NUM - Number(gpt3limit) <= 0) {
        //     appendMsg(
        //       buildChatMessage(
        //         <p className="p-2">
        //           You have reached the limit of {GPT3_LIMIT_NUM} GPT3.5 requests.
        //         </p>,
        //         'card'
        //       )
        //     );
        //     return;
        //   } else {
        //     setGpt3limit(Number((gpt3limit + 1).toFixed(0)));
        //   }
        // }
        userApi.sentMessage({
          conversationId: conversationId,
          senderId: message.from?.name,
          receiverId: message.to,
          content: message.content,
          agent: plugin.action,
          model: model
        })


        appendMsg(message);

        // setTyping(true);
      } else if (type === 'file') {
        const files = message.files;
        const progress = showProgress();
        const fileContent = await parseDocuments(message.files, async (file, i) => {
          await sleep(300);
          progress(((i + 1) / files.length) * 100)
        });
        if (fileContent) {
          message.content = fileContent;
          message.text = fileContent;
        } else {
          message.text = '';
        }
        appendMsg(message);
      } else if (type === 'parts') {
        const files = message.files;
        const text = message.text;
        const progress = showProgress();
        const fileContent = await parseDocuments(message.files, async (file, i) => {
          await sleep(300);
          progress(((i + 1) / files.length) * 100)
        });
        // const fileNames = message.files.map(p => `1. ${p.name}`).join('\n');
        if (fileContent) {
          message.content = fileContent + '\n' + text;
          // message.type = 'text';
          // message.content = `Here are files:\n${fileNames}\n\n${text}\nlet knowledge handle it.`
        } else {
          message.content = text;
        }
        appendMsg(message);
      } else {
        appendMsg(message);
      }
    }
    setTimeout(() => {
      publish(message)
    }, 0)

  }, [gptFreelimit, conversationId, model, plugins])


  const subscribeMessage = useCallback(() => {
    if (!context.current) {
      return;
    }
    // subscribe all message from assistant
    subscribe((message) => {
      if (typeof message.content === 'string') {
        userApi.sentMessage({
          conversationId: conversationId,
          senderId: message.from?.name,
          receiverId: message.to,
          content: message.content,
          agent: plugin.action,
          model: model
        })
      } else if (typeof message.content === 'object' || (message.content as any).props) {
        userApi.sentMessage({
          conversationId: conversationId,
          senderId: message.from?.name,
          receiverId: message.to,
          content: JSON.stringify((message.content as any).props),
          agent: plugin.action,
          model: model
        })
      }

      appendMsg(message)
    }, {
      sender: user.email,
      mentions: [],
      role: 'assistant'
    })
    // current plugin subscribe message from user,no mention
    subscribe(async (message) => {

      // if (message?.mentions?.length > 0 && message?.mentions[0] != plugin.action) {
      //   return;
      // }
      try {
        setTyping(true);
        await plugin.chatWithAgent(message)
      } catch (e) {
        console.error(e)
        logEvent('exception', {
          'agent': plugin.action,
          'message': e.message,
        })
        if (e.code === 401) {
          setUserState({
            isAuthenticated: false
          })
        } else {
          appendMsg(buildChatMessage(`Exception: ${e.message}\n${e.stack}`, 'text'));
        }

      } finally {
        setTyping(false);
      }

    }, {
      sender: plugin.action,
      mentions: [],
      role: 'user'
    })
    // plugin only subscribe message that include mention
    // plugins
    //   .filter(p => p.action !== 'sally')
    //   .forEach((plg) => {
    //     subscribe(async (message) => {
    //       plg.context = context.current;
    //       try {
    //         setTyping(true);
    //         await plg.chatWithAgent(message)
    //       } catch (e) {
    //         console.error(e)
    //         logEvent('exception', {
    //           'agent': plg.action,
    //           'message': e.message,
    //         })
    //         if (e.code === 401) {
    //           setUserState({
    //             isAuthenticated: false
    //           })
    //         } else {
    //           appendMsg(buildChatMessage(`Exception: ${e.message}`, 'text'));
    //         }
    //       } finally {
    //         setTyping(false);
    //       }
    //     }, {
    //       sender: plg.action,
    //       mentions: [plg.action]
    //     })
    //   })
  }, [plugin, conversationId, model]);

  const chatByModel = useCallback((args: IChatBody, callback: any) => {
    args.model = args.model || model;
    args.temperature = typeof args.temperature === 'undefined' ? 0.7 : args.temperature;
    return chat(args, callback)
  }, [model]);

  context.current = {
    platform: PLATFORM,
    plugins,
    plugin,
    messages,
    replies,
    loading,
    typing,
    setPlugin,
    setPlugins,
    appendMsg,
    resetList,
    setTyping,
    prependMsgs,
    updateMsg,
    sendMsg,
    quickReply,
    text,
    setText,
    chat: chatByModel,
    completions,
    user,
    docType,
    mode,
    setMode,
    mute,
    setMute,
    model,
    setModel,
    dataAsContext,
    setDataAsContext,
    dataContext,
    setDataContext,
    tools,
    agentTools,
    colAgents,
    setAgentTools,
    setAgentTool,
    setColAgent,
    setColAgents
  };

  useEffect(() => {
    plugin.context = context.current;
    if (!plugin) {
      setReplies([]);
      return;
    }
    const list = plugin.quickReplies('');
    if (list) {
      setReplies(list);
    }
  }, [plugin, colAgents]);

  useEffect(() => {
    if (!plugin.render) {
      loadMessages();
    }
    plugin.context = context.current;
    if (plugin.onLoad) {
      plugin.onLoad();
    }

  }, [plugin]);

  useEffect(() => {
    if (plugins) {
      plugins.forEach((plg) => {
        plg.context = context.current;
      })
    }
  }, [context.current]);

  // useEffect(() => {
  //   checkUserState();
  // }, []);

  useEffect(() => {
    subscribeMessage()
    return () => {
      unsubscribe();
    }
  }, [subscribeMessage]);

  useEffect(() => {
    setConversationId(uuid())
  }, [plugin, model])


  return (
    <ChatContext.Provider value={context.current}>
      {children}
    </ChatContext.Provider>
  );
};

export { ChatContext, ChatProvider };
