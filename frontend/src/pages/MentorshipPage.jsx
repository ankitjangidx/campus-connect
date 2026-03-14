import { useEffect, useState } from "react";

import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { formatDate } from "../lib/utils";

function MentorshipPage() {
  const { user } = useAuth();
  const [mentorships, setMentorships] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadMentorships() {
      try {
        const response = await api.get(`/users/${user.id}/mentorships`);
        if (!ignore) {
          setMentorships(response);
        }
      } catch (requestError) {
        if (!ignore) {
          setError(requestError.message);
        }
      }
    }

    loadMentorships();

    return () => {
      ignore = true;
    };
  }, [user.id]);

  if (error) {
    return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!mentorships) {
    return <LoadingState label="Loading mentorship history..." />;
  }

  return (
    <div className="space-y-8">
      <section className="cc-card p-8">
        <h1 className="text-3xl font-bold">People Mentored</h1>
        <p className="text-gray-500">
          This page mirrors the original mentorship summary cards with live API data.
        </p>
      </section>

      {mentorships.length ? (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {mentorships.map((mentorship) => (
            <article key={mentorship.id} className="cc-card p-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                {formatDate(mentorship.startedAt)}
              </p>
              <h2 className="mb-3 text-xl font-semibold">{mentorship.menteeName}</h2>
              <p className="mb-3 inline-flex rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                {mentorship.focusArea}
              </p>
              <p className="text-sm text-gray-600">{mentorship.notes}</p>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          title="No mentorship records yet"
          description="Mentorship entries will appear here once they exist in the database."
        />
      )}
    </div>
  );
}

export default MentorshipPage;
