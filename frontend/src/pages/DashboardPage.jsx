import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import { api } from "../lib/api";
import { getSharedUserSocket } from "../lib/socket";
import { formatDate, formatDateTime, formatMessageTimestamp } from "../lib/utils";

function appendUniqueMessage(messages, message) {
  if (messages.some((item) => item.id === message.id)) {
    return messages;
  }

  return [...messages, message].sort(
    (left, right) => new Date(left.createdAt) - new Date(right.createdAt)
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { lastCreated } = useNotifications();
  const location = useLocation();
  const [dashboard, setDashboard] = useState(null);
  const [connections, setConnections] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [chatSearch, setChatSearch] = useState("");
  const [activePeerId, setActivePeerId] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [requestActionId, setRequestActionId] = useState(null);
  const [requestRejectId, setRequestRejectId] = useState(null);
  const [error, setError] = useState("");
  const [chatError, setChatError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadDashboard() {
      try {
        const [dashboardResponse, connectionsResponse, requestsResponse] = await Promise.all([
          api.get(`/users/${user.id}/dashboard`),
          api.get(`/users/${user.id}/connections`),
          api.get(`/users/${user.id}/connection-requests`)
        ]);

        if (!ignore) {
          setDashboard(dashboardResponse);
          setConnections(connectionsResponse);
          setIncomingRequests(requestsResponse.incoming || []);
          setActivePeerId((current) => current);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadDashboard();

    return () => {
      ignore = true;
    };
  }, [location.search, user.id]);

  useEffect(() => {
    if (!lastCreated?.id) {
      return;
    }

    // Keep dashboard request list live without requiring a refresh.
    if (lastCreated.type === "connection_request") {
      void api.get(`/users/${user.id}/connection-requests`).then((response) => {
        setIncomingRequests(response.incoming || []);
      });
      return;
    }

    if (lastCreated.type === "connection_accepted") {
      void api.get(`/users/${user.id}/connections`).then((response) => {
        setConnections(response);
      });
    }
  }, [lastCreated?.id, lastCreated?.type, user.id]);

  useEffect(() => {
    if (!activePeerId) {
      setConversation([]);
      return;
    }

    let ignore = false;

    async function loadConversation() {
      try {
        const response = await api.get(`/users/${user.id}/messages/${activePeerId}`);
        if (!ignore) {
          setConversation(response.messages);
        }
      } catch (requestError) {
        if (!ignore) {
          setChatError(requestError.message);
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
      const peerId =
        message.senderId === user.id ? message.recipientId : message.senderId;

      if (peerId === activePeerId) {
        setConversation((current) => appendUniqueMessage(current, message));

        if (message.senderId === activePeerId && message.recipientId === user.id) {
          void api.get(`/users/${user.id}/messages/${activePeerId}`).then((response) => {
            setConversation(response.messages);
          });
        }
      }

      setDashboard((current) => {
        if (!current) {
          return current;
        }

        const peer = connections.find((item) => item.id === peerId);
        const nextRecent = [
          {
            id: message.id,
            body: message.body,
            createdAt: message.createdAt,
            peer: {
              id: peerId,
              name: peer?.fullName || peer?.username || "Connected user"
            }
          },
          ...current.recentMessages.filter((item) => item.id !== message.id)
        ].slice(0, 6);

        return {
          ...current,
          recentMessages: nextRecent
        };
      });
    }

    socket.on("message:created", handleMessageCreated);

    return () => {
      socket.off("message:created", handleMessageCreated);
    };
  }, [activePeerId, connections, user.id]);

  const activeConnection = useMemo(
    () => connections.find((connection) => connection.id === activePeerId) || null,
    [activePeerId, connections]
  );

  const filteredConnections = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();

    if (!query) {
      return connections;
    }

    return connections.filter((connection) => {
      const label = `${connection.fullName || ""} ${connection.username || ""} ${
        connection.branch || ""
      }`.toLowerCase();
      return label.includes(query);
    });
  }, [chatSearch, connections]);

  async function handleSendMessage(event) {
    event.preventDefault();

    if (!activePeerId || !draft.trim()) {
      return;
    }

    setSending(true);
    setChatError("");

    try {
      const message = await api.post(`/users/${user.id}/messages/${activePeerId}`, {
        body: draft
      });
      setConversation((current) => appendUniqueMessage(current, message));
      setDraft("");
    } catch (requestError) {
      setChatError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  async function handleAcceptRequest(requestItem) {
    setRequestActionId(requestItem.requestId);
    setError("");

    try {
      const acceptedConnection = await api.post(
        `/users/${user.id}/connection-requests/${requestItem.requestId}/accept`,
        {}
      );

      setIncomingRequests((current) =>
        current.filter((item) => item.requestId !== requestItem.requestId)
      );
      setConnections((current) =>
        current.some((item) => item.id === acceptedConnection.id)
          ? current
          : [acceptedConnection, ...current]
      );
      setDashboard((current) =>
        current
          ? {
              ...current,
              stats: {
                ...current.stats,
                connectionsMade: current.stats.connectionsMade + 1
              }
            }
          : current
      );
      setActivePeerId((current) => current);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRequestActionId(null);
    }
  }

  async function handleRejectRequest(requestItem) {
    if (!window.confirm("Reject this connection request?")) {
      return;
    }

    setRequestRejectId(requestItem.requestId);
    setError("");

    try {
      await api.post(
        `/users/${user.id}/connection-requests/${requestItem.requestId}/reject`,
        {}
      );

      setIncomingRequests((current) =>
        current.filter((item) => item.requestId !== requestItem.requestId)
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setRequestRejectId(null);
    }
  }

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!dashboard) {
    return <LoadingState label="Loading dashboard..." />;
  }

  const statusItems = [
    ["Basic Info", dashboard.profileStatus.basicInfo],
    ["Academic Details", dashboard.profileStatus.academicDetails],
    ["Career Info", dashboard.profileStatus.careerInfo],
    ["Skills", dashboard.profileStatus.skills]
  ];

  return (
    <div className="space-y-8">
      <div className="mb-8 flex items-center justify-between rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {dashboard.user.displayName}! 👋</h1>
          <p className="mt-2 text-blue-100">
            Ready to connect and grow your network today?
          </p>
        </div>
        <div className="hidden gap-3 md:flex">
          <Link to="/forum" className="rounded-lg bg-white/20 px-4 py-2">
            Ask Question
          </Link>
          <Link to="/connect" className="rounded-lg bg-white px-4 py-2 text-blue-600">
            Find Mentors
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/mentorships"
          className="cc-card flex items-center justify-between p-6 transition hover:scale-[1.02] hover:bg-blue-50"
        >
          <div>
            <p className="text-sm text-gray-500">People Mentored</p>
            <p className="text-3xl font-bold">{dashboard.stats.peopleMentored}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-2xl text-blue-600">
            👥
          </div>
        </Link>

        <Link
          to="/connections"
          className="cc-card flex items-center justify-between p-6 transition hover:scale-[1.02] hover:bg-green-50"
        >
          <div>
            <p className="text-sm text-gray-500">Connections Made</p>
            <p className="text-3xl font-bold">{dashboard.stats.connectionsMade}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-2xl text-green-600">
            💬
          </div>
        </Link>

        <Link
          to="/questions"
          className="cc-card flex items-center justify-between p-6 transition hover:scale-[1.02] hover:bg-purple-50"
        >
          <div>
            <p className="text-sm text-gray-500">Questions Asked</p>
            <p className="text-3xl font-bold">{dashboard.stats.questionsAsked}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 text-2xl text-purple-600">
            ❓
          </div>
        </Link>

        <div className="cc-card flex items-center justify-between p-6">
          <div>
            <p className="text-xs text-gray-500">Badges Earned</p>
            <p className="text-2xl font-bold">{dashboard.stats.badgesEarned}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-2xl text-orange-600">
            🏅
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="cc-card overflow-hidden">
            <div className="border-b p-5 font-semibold">Connection Requests</div>
            {incomingRequests.length ? (
              <div className="divide-y">
                {incomingRequests.map((request) => (
                  <div
                    key={request.requestId}
                    className="flex items-center justify-between gap-4 px-5 py-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {request.fullName || request.username}
                      </div>
                      <div className="text-sm text-slate-500">
                        {request.course || "Student"} • {request.branch || "Campus Connect"}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">
                        Requested {formatDateTime(request.requestedAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleAcceptRequest(request)}
                        type="button"
                        disabled={
                          requestActionId === request.requestId ||
                          requestRejectId === request.requestId
                        }
                      >
                        {requestActionId === request.requestId ? "Accepting..." : "Accept"}
                      </button>
                      <button
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => handleRejectRequest(request)}
                        type="button"
                        disabled={
                          requestActionId === request.requestId ||
                          requestRejectId === request.requestId
                        }
                      >
                        {requestRejectId === request.requestId ? "Rejecting..." : "Reject"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-14 text-center text-gray-400">
                <div className="mb-3 text-5xl">👥</div>
                No pending connection requests
              </div>
            )}
          </div>

          <div className="cc-card overflow-hidden">
            <div className="border-b p-5 font-semibold">Messages</div>
            {connections.length ? (
              <div className="grid min-h-[360px] grid-cols-3">
                <div className="border-r p-4 text-gray-700">
                  <div className="mb-3">
                    <input
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      value={chatSearch}
                      onChange={(event) => setChatSearch(event.target.value)}
                      placeholder="Search users..."
                    />
                  </div>
                  <div className="space-y-2">
                    {filteredConnections.map((connection) => (
                      <button
                        key={connection.id}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                          activePeerId === connection.id
                            ? "bg-blue-100 font-medium text-blue-700"
                            : "hover:bg-gray-100"
                        }`}
                        onClick={() => setActivePeerId(connection.id)}
                      >
                        <div className="font-semibold">
                          {connection.fullName || connection.username}
                        </div>
                        <div className="text-xs text-gray-500">{connection.branch}</div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Connected {formatDateTime(connection.connectedAt)}
                        </div>
                      </button>
                    ))}
                    {!filteredConnections.length ? (
                      <div className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-400">
                        No users match your search
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="col-span-2 flex flex-col">
                  <div className="border-b p-4">
                    <div className="font-semibold">
                      {activeConnection
                        ? activeConnection.fullName || activeConnection.username
                        : "Select a connection to start chatting"}
                    </div>
                    {activeConnection ? (
                      <div className="mt-1 text-xs text-slate-400">
                        Connected {formatDateTime(activeConnection.connectedAt)}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 space-y-3 bg-gray-50 p-4">
                    {activePeerId && conversation.length ? (
                      conversation.map((message) => {
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
                                <div>{message.body}</div>
                              </div>
                              <div className="mt-1 px-1 text-[11px] font-medium text-slate-500">
                                {formatMessageTimestamp(message.createdAt)}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400">
                        {activePeerId ? "No messages yet" : "Select a connection to start chatting"}
                      </div>
                    )}
                  </div>

                  {chatError ? (
                    <div className="border-t bg-red-50 px-4 py-2 text-sm text-red-700">
                      {chatError}
                    </div>
                  ) : null}

                  {activePeerId ? (
                    <form
                      className="flex gap-3 border-t bg-white p-4"
                      onSubmit={handleSendMessage}
                    >
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
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid min-h-[360px] grid-cols-3">
                <div className="border-r p-4 text-gray-500">No connections yet</div>
                <div className="col-span-2 flex flex-col items-center justify-center text-gray-400">
                  <div className="mb-3 text-5xl">💬</div>
                  Select a connection to start chatting
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="cc-card overflow-hidden">
            <div className="border-b p-5 font-semibold">Profile Status</div>
            <div className="space-y-3 p-5 text-sm">
              {statusItems.map(([label, done]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      done ? "bg-black text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
                    {done ? "Complete" : "Incomplete"}
                  </span>
                </div>
              ))}
              <Link
                to="/profile"
                className="mt-2 block rounded-lg bg-blue-600 py-2 text-center text-white"
              >
                Update Profile
              </Link>
            </div>
          </div>

          <div className="cc-card overflow-hidden">
            <div className="border-b p-5 font-semibold">Quick Actions</div>
            <div className="space-y-3 p-5">
              <Link
                to="/forum"
                className="flex w-full justify-center gap-2 rounded-lg border py-2"
              >
                💬 Ask a Question
              </Link>
              <Link
                to="/connect"
                className="flex w-full justify-center gap-2 rounded-lg border py-2"
              >
                👥 Find Senior Mentors
              </Link>
            </div>
          </div>

          <div className="cc-card overflow-hidden">
            <div className="border-b p-5 font-semibold">Recent Questions</div>
            {dashboard.questions.length ? (
              <div className="space-y-4 p-5">
                {dashboard.questions.map((question) => (
                  <div key={question.id} className="rounded-xl border p-4">
                    <p className="mb-1 font-semibold">{question.title}</p>
                    <p className="text-sm text-gray-500">{question.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No forum posts yet"
                description="Ask a question to start getting help from seniors and peers."
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
