import { useEffect, useState } from 'react'
import userApi from '@api/user'
import { USER_SET_AI_MODEL } from 'chat-list/config/openai';
import { GptModel } from 'chat-list/types/chat';
import useLocalStore from './useLocalStore';
import { IChatPlugin } from 'chat-list/types/plugin';
import { getAgentModel, setAgentModel } from 'chat-list/local/local';

interface IUseModel {
    model: GptModel,
    setModel: (model: GptModel) => void;
}
const defaultValue = 'gpt-3.5-turbo';
export default function useModel(plugin: IChatPlugin): IUseModel {
    // const [model, setCurrentModel] = useState<GptModel>(defaultValue)
    const { value: model, setValue: setModelToLocal } = useLocalStore(USER_SET_AI_MODEL, defaultValue);
    // const loadModel = async () => {
    //     const agentModel = getAgentModel(plugin.action);
    //     if (!agentModel) {
    //         // set agent default model
    //         setCurrentModel(plugin.models[0])
    //     } else {
    //         setCurrentModel(agentModel)
    //     }
    // }
    // const setModel = (value: GptModel) => {
    //     // setModelToLocal(value)
    //     // await userApi.setUserProperty(USER_SET_AI_MODEL, value);
    //     setCurrentModel(value);
    //     setAgentModel(plugin.action, value)
    // }
    // useEffect(() => {
    //     loadModel()
    // }, [plugin])
    return {
        model,
        setModel: setModelToLocal
    }
}
