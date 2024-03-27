import userApi from '@api/user';

import React, { createContext, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { IUserContextState, IUserState } from 'chat-list/types/user';
import useUserProperty from 'chat-list/hook/useUserProperty'
import { GPT_API_LIMIT_KEY } from 'chat-list/config/constant';
const UserContext = createContext<IUserContextState>(null);
const UserProvider = ({ children }: any) => {
  const [user, setUser] = useState<IUserState>(null);
  // const [limit, setLimit] = useState(0);
  //  time stamp , log user use start time
  const [loading, setLoading] = useState(true);
  // const { loading: timestampLoading, value: timestamp, setValue: setTimestamp } = useUserProperty(timestampKey, Date.now());
  const { value: gptFreelimit, setValue: setGptFreelimit } = useUserProperty(GPT_API_LIMIT_KEY, 0);
  // const { loading: gpt4limitLoading, value: gpt4limit, setValue: setGpt4limit } = useUserProperty(gpt4key, 0);
  // const { loading: gpt3limitLoading, value: gpt3limit, setValue: setGpt3limit } = useUserProperty(gpt3key, 0);

  // const registUser = async () => {
  //   const user = await regist();
  //   setUser(user);
  // };

  const checkUserState = async () => {
    try {
      const userState = await userApi.checkUser();
      const { state, email, version, gpt, exp, gptLimit, noApiKey, interval } = userState;
      // debugger;
      setUser({
        ...user,
        email,
        state,
        version,
        gpt,
        exp,
        gptLimit,
        noApiKey,
        interval,
        username: email.split('@')[0],
      });
      setLoading(false);
    } catch (e) {
      // TODO
    }

    // setLimit(gptLimit);

  };
  const setUserState = useCallback(async (state = {}) => {
    setUser({
      ...user,
      ...state
    })
  }, [user]);

  // const checkTimestamp = async () => {
  //   // a month
  //   if (timestampLoading) {
  //     return;
  //   }
  //   if (timestamp > 0) {
  //     if (Date.now() - timestamp > 1000 * 60 * 60 * 24 * 365) {
  //       setTimestamp(Date.now());
  //       await setGpt4limit(0);
  //       await setGpt3limit(0);
  //     }
  //   } else {
  //     setTimestamp(Date.now());
  //   }
  // }

  // const checkLimit = async () => {
  //   if (!gptFreelimitLoading && !gpt4limitLoading && !gpt3limitLoading && !timestampLoading) {
  //     await checkTimestamp();
  //     setLoading(false);
  //   }
  // }

  useLayoutEffect(() => {
    checkUserState();
  }, []);

  // useEffect(() => {
  //   checkLimit();
  // }, [gptFreelimitLoading, gpt4limitLoading, gpt3limitLoading, timestampLoading]);



  if (!user) {
    return null;
  }
  // console.log(gpt4limit, gpt3limit)
  return (
    <UserContext.Provider value={{
      loading,
      user,
      gptFreelimit: Number(gptFreelimit),
      setUserState,
      setGptFreelimit
    }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
