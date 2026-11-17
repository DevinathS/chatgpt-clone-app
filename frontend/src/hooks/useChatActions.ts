import { useCallback } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { abortCurrent, regenerate, sendMessage } from '../store/chatSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { openAuth } from '../store/uiSlice';

/** Route-aware helpers shared by the composer, suggestion chips and message action buttons. */
export function useChatActions() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const streaming = useAppSelector((s) => s.chat.streaming);
  const match = useMatch('/c/:conversationId');
  const conversationId = match?.params.conversationId ?? null;

  /** Returns true if the message was sent (false when signed out or already streaming). */
  const send = useCallback(
    (content: string): boolean => {
      const text = content.trim();
      if (!text || streaming) return false;
      if (!user) {
        dispatch(openAuth('login'));
        return false;
      }
      dispatch(
        sendMessage({
          content: text,
          conversationId,
          onCreated: (id) => navigate(`/c/${id}`),
        }),
      );
      return true;
    },
    [dispatch, navigate, user, streaming, conversationId],
  );

  const stop = useCallback(() => abortCurrent(), []);
  const regen = useCallback(() => {
    dispatch(regenerate());
  }, [dispatch]);

  return { send, stop, regenerate: regen, streaming };
}
