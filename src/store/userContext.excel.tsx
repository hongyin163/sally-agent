import userApi from '@api/user';

import React, { createContext, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { IUserContextState, IUserState } from 'chat-list/types/user';
import useUserProperty from 'chat-list/hook/useUserProperty'
import { GPT_API_LIMIT_KEY } from 'chat-list/config/constant';
import { getLicenseConfig, getToken, getTokenExpireTime, setToken } from 'chat-list/local/local';
import { login } from 'chat-list/service/auth';
const UserContext = createContext<IUserContextState>(null);
const timestampKey = 'SHEET_CHAT_TIMESTAMP';
// const gpt4key = `gpt4-limit-num`;
// const gpt3key = `gpt3-limit-num`
const UserProvider = ({ children }: any) => {
  const [user, setUser] = useState<IUserState>(null);
  // const [limit, setLimit] = useState(0);
  //  time stamp , log user use start time
  const [loading, setLoading] = useState(true);
  const { loading: timestampLoading, value: timestamp, setValue: setTimestamp } = useUserProperty(timestampKey, Date.now());
  const { loading: gptFreelimitLoading, value: gptFreelimit, setValue: setGptFreelimit } = useUserProperty(GPT_API_LIMIT_KEY, 0);
  // const { loading: gpt4limitLoading, value: gpt4limit, setValue: setGpt4limit } = useUserProperty(gpt4key, 0);
  // const { loading: gpt3limitLoading, value: gpt3limit, setValue: setGpt3limit } = useUserProperty(gpt3key, 0);

  // const registUser = async () => {
  //   const user = await regist();
  //   setUser(user);
  // };

  const checkToken = (token: string) => {
    if (!token) {
      return false;
    }
    const time = getTokenExpireTime();
    if (Date.now() > time) {
      return false;
    }
    return true;
  }

  const checkUserState = async () => {
    // check token first
    // if token not exist, check if license key exist
    // if have license key ,request new token
    // if not have license key ,show license form
    // if toke exist, use api request to check token is expire
    // if return 401, check license key, use key to create new token 
    // if no license key, show form to let user input license key
    // if licnese is expire, show dialog
    try {
      setLoading(true);
      const token = getToken();
      if (!checkToken(token)) {
        const licenseKey = getLicenseConfig();
        if (licenseKey) {
          const token = await login(licenseKey);
          setToken(token);
        } else {
          setUser({
            ...user,
            isAuthenticated: false
          });
          return;
        }
      }
      const userState = await userApi.checkUser();
      const { state, email, version, gpt, exp, gptLimit, noApiKey, interval } = userState;
      console.log(userState)
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
        isAuthenticated: true
      });
      setLoading(false);
    } catch (e) {
      if (e.code == 401) {
        setUser({
          ...user,
          isAuthenticated: false
        });
      }
    } finally {
      setLoading(false);
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
  //     if (Date.now() - timestamp > 1000 * 60 * 60 * 24 * 30) {
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

  const loadApiLimit = async () => {
    try {
      const result = await userApi.apiLimit();
      // setGpt3limit(result.gpt3Count);
      // setGpt4limit(result.gpt4Count);
      setGptFreelimit(result.freeCount);
      setTimestamp(result.lastResetTimestamp);
    } catch (e) {
      console.log(e)
    }
  }

  useLayoutEffect(() => {
    checkUserState();
    loadApiLimit();
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
