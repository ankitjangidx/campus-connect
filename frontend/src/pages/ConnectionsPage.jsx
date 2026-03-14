import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate, getDisplayName } from "../lib/utils";

function ConnectionsPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState(null);
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
        }
      }
    }

    loadConnections();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!connections) {
    return <LoadingState label="Loading connections..." />;
  }

  return (
    <div className="space-y-8">
      <section className="cc-card flex flex-col gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Connections Made</h1>
          <p className="text-gray-500">
            Continue conversations and revisit people already in your network.
          </p>
        </div>
        <Link to="/connect" className="cc-button-primary text-center">
          Discover More People
        </Link>
      </section>

      {connections.length ? (
        <section className="space-y-5">
          {connections.map((connection) => (
            <article key={connection.id} className="cc-card p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="cc-avatar h-12 w-12 bg-blue-100 text-blue-700">
                    {getDisplayName(connection)[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{getDisplayName(connection)}</h2>
                    <p className="text-sm text-gray-500">
                      {[connection.course, connection.branch].filter(Boolean).join(" • ")}
                    </p>
                    <p className="mt-2 text-sm text-gray-600">{connection.bio}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-sm text-gray-500">
                    Connected {formatDate(connection.connectedAt)}
                  </p>
                  <div className="flex gap-3">
                    <Link to={`/users/${connection.id}`} className="cc-button-secondary">
                      Profile
                    </Link>
                    <Link to={`/chat/${connection.id}`} className="cc-button-primary">
                      Chat
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No connections yet"
          description="Once you connect with someone, they will appear here."
        />
      )}
    </div>
  );
}

export default ConnectionsPage;
