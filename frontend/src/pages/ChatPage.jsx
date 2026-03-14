import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { getSharedUserSocket } from "../lib/socket";
import { formatMessageTimestamp, getDisplayName } from "../lib/utils";

function appendUniqueMessage(messages, message) {
  if (messages.some((item) => item.id === message.id)) {
    return messages;
  }

  return [...messages, message].sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
  );
}

function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { peerId } = useParams();
  const activePeerId = peerId ? Number.parseInt(peerId, 10) : null;
  const [connections, setConnections] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [draft, setDraft] = useState("");
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadConnections() {
      try {
        const response = await api.get(`/users/${user.id}/connections`);
        if (!ignore) {
          setConnections(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
          setConnections([]);
        }
      }
    }

    loadConnections();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  useEffect(() => {
    if (!connections || activePeerId || !connections.length) {
      return;
    }

    navigate(`/chat/${connections[0].id}`, { replace: true });
  }, [connections, activePeerId, navigate]);

  useEffect(() => {
    if (!activePeerId) {
      setConversation(null);
      return;
    }

    let ignore = false;

    async function loadConversation() {
      setLoadingConversation(true);
      setError("");

      try {
        const response = await api.get(`/users/${user.id}/messages/${activePeerId}`);
        if (!ignore) {
          setConversation(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoadingConversation(false);
        }
      }
    }

    loadConversation();

    return () => {
      ignore = true;
    };
  }, [activePeerId, user.id]);

  useEffect(() => {
    const socket = getSharedUserSocket();

    function handleMessageCreated(message) {
      if (
        activePeerId &&
        [message.senderId, message.recipientId].includes(activePeerId)
      ) {
        setConversation((current) =>
          current
            ? {
                ...current,
                messages: appendUniqueMessage(current.messages, message)
              }
            : current
        );

        if (message.senderId === activePeerId && message.recipientId === user.id) {
          void api.get(`/users/${user.id}/messages/${activePeerId}`).then((response) => {
            setConversation(response);
          });
        }
      }
    }

    socket.on("message:created", handleMessageCreated);

    return () => {
      socket.off("message:created", handleMessageCreated);
    };
  }, [activePeerId, user.id]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!activePeerId || !draft.trim()) {
      return;
    }

    setSending(true);
    setError("");

    try {
      const message = await api.post(`/users/${user.id}/messages/${activePeerId}`, {
        body: draft
      });
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: appendUniqueMessage(current.messages, message)
            }
          : current
      );
      setDraft("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  if (!connections) {
    return <LoadingState label="Loading chat..." />;
  }

  const activeName = conversation ? getDisplayName(conversation.peer) : "Chat";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center gap-3 border-b bg-white p-4">
        <button onClick={() => navigate("/connect")} className="text-gray-500 hover:text-black">
          ←
        </button>
        <h2 className="text-lg font-semibold">{activeName}</h2>
      </header>

      {!connections.length ? (
        <div className="mx-auto mt-6 max-w-4xl">
          <EmptyState
            title="No active chat found"
            description="Create a connection first and then open the chat page again."
          />
        </div>
      ) : (
        <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto bg-gray-100 p-4">
            {loadingConversation ? (
              <LoadingState label="Loading conversation..." />
            ) : conversation?.messages.length ? (
              conversation.messages.map((message) => {
                const mine = message.senderId === user.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-xs ${mine ? "text-right" : "text-left"}`}>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          mine ? "bg-blue-600 text-white" : "bg-white"
                        }`}
                      >
                        <p>{message.body}</p>
                      </div>
                      <p className="mt-1 px-1 text-[11px] font-medium text-slate-500">
                        {formatMessageTimestamp(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                title="No messages yet"
                description="Start the conversation with a short message."
              />
            )}
          </div>

          {error ? <div className="bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div> : null}

          <form className="flex gap-3 border-t bg-white p-4" onSubmit={handleSubmit}>
            <input
              className="flex-1 rounded-lg border px-4 py-2"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Type a message..."
            />
            <button
              className="rounded-lg bg-blue-600 px-6 text-white hover:bg-blue-700"
              type="submit"
              disabled={sending}
            >
              {sending ? "Sending" : "Send"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default ChatPage;
