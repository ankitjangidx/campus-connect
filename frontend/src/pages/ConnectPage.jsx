import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { getDisplayName } from "../lib/utils";

function ConnectPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [connections, setConnections] = useState([]);
  const [requests, setRequests] = useState({
    incoming: [],
    outgoing: []
  });
  const [filters, setFilters] = useState({
    search: "",
    course: "",
    branch: "",
    exam: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionUserId, setActionUserId] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const [userResponse, connectionResponse, requestResponse] = await Promise.all([
          api.get("/users"),
          api.get(`/users/${user.id}/connections`),
          api.get(`/users/${user.id}/connection-requests`)
        ]);

        if (!ignore) {
          setUsers(userResponse);
          setConnections(connectionResponse);
          setRequests(requestResponse);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  async function handleConnect(targetUserId) {
    setActionUserId(targetUserId);
    setError("");

    try {
      const newConnection = await api.post(`/users/${user.id}/connections`, {
        targetUserId
      });

      if (newConnection.status === "accepted") {
        setConnections((current) =>
          current.some((item) => item.id === newConnection.id)
            ? current
            : [newConnection, ...current]
        );
        return;
      }

      setRequests((current) => ({
        ...current,
        outgoing: current.outgoing.some((item) => item.id === newConnection.id)
          ? current.outgoing
          : [newConnection, ...current.outgoing]
      }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setActionUserId(null);
    }
  }

  if (loading) {
    return <LoadingState label="Loading mentors..." />;
  }

  const connectedIds = new Set(connections.map((connection) => connection.id));
  const outgoingRequestIds = new Set(requests.outgoing.map((request) => request.id));
  const incomingRequestIds = new Set(requests.incoming.map((request) => request.id));
  const courseOptions = [...new Set(users.map((item) => item.course).filter(Boolean))];
  const branchOptions = [...new Set(users.map((item) => item.branch).filter(Boolean))];
  const examOptions = [...new Set(users.map((item) => item.examType).filter(Boolean))];

  const filteredUsers = users.filter((person) => {
    const searchText = filters.search.trim().toLowerCase();
    return (
      (!searchText || getDisplayName(person).toLowerCase().includes(searchText)) &&
      (!filters.course || person.course === filters.course) &&
      (!filters.branch || person.branch === filters.branch) &&
      (!filters.exam || person.examType === filters.exam)
    );
  });

  return (
    <div className="space-y-8">
      <section className="cc-card p-8">
        <h1 className="mb-2 text-3xl font-bold">Connect with Seniors & Peers</h1>
        <p className="text-gray-500">
          Find mentors based on exam preparation, branch, and experience
        </p>
      </section>

      <section className="cc-card space-y-4 p-6">
        <input
          className="cc-input"
          value={filters.search}
          onChange={(event) => updateFilter("search", event.target.value)}
          placeholder="Search by name..."
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <select
            className="cc-select"
            value={filters.course}
            onChange={(event) => updateFilter("course", event.target.value)}
          >
            <option value="">All Program</option>
            {courseOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            className="cc-select"
            value={filters.branch}
            onChange={(event) => updateFilter("branch", event.target.value)}
          >
            <option value="">All Branches</option>
            {branchOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select className="cc-select" disabled>
            <option>All Years</option>
          </select>
          <select
            className="cc-select"
            value={filters.exam}
            onChange={(event) => updateFilter("exam", event.target.value)}
          >
            <option value="">All Exam Prep</option>
            {examOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </section>

      {error ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      {filteredUsers.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((person) => {
            const isConnected = connectedIds.has(person.id);
            const hasOutgoingRequest = outgoingRequestIds.has(person.id);
            const hasIncomingRequest = incomingRequestIds.has(person.id);

            return (
              <div key={person.id} className="cc-card p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="cc-avatar h-12 w-12 bg-blue-100 text-blue-700">
                    {getDisplayName(person)[0]}
                  </div>
                  <div>
                    <p className="font-semibold">{getDisplayName(person)}</p>
                    <p className="text-xs text-gray-500">{person.branch}</p>
                  </div>
                </div>

                <p className="mb-4 text-xs text-gray-500">
                  {person.course} • {person.admissionYear || "Student"} •{" "}
                  {person.examType || "General"}
                </p>

                <Link
                  to={`/users/${person.id}`}
                  className="mb-2 block w-full rounded-lg border border-gray-300 py-2 text-center hover:bg-gray-100"
                >
                  View Profile
                </Link>

                {isConnected ? (
                  <Link
                    to={`/chat/${person.id}`}
                    className="block w-full rounded-lg bg-green-600 py-2 text-center text-white hover:bg-green-700"
                  >
                    Chat
                  </Link>
                ) : hasOutgoingRequest ? (
                  <button
                    className="w-full cursor-not-allowed rounded-lg bg-amber-100 py-2 text-amber-700"
                    disabled
                    type="button"
                  >
                    Pending
                  </button>
                ) : hasIncomingRequest ? (
                  <Link
                    to="/dashboard"
                    className="block w-full rounded-lg bg-violet-100 py-2 text-center font-medium text-violet-700 hover:bg-violet-200"
                  >
                    Accept in Dashboard
                  </Link>
                ) : (
                  <button
                    className="w-full rounded-lg bg-blue-600 py-2 text-white hover:bg-blue-700"
                    onClick={() => handleConnect(person.id)}
                    disabled={actionUserId === person.id}
                  >
                    {actionUserId === person.id ? "Connecting..." : "Connect"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No users match your filters"
          description="Try broadening the search or removing a filter."
        />
      )}
    </div>
  );
}

export default ConnectPage;
